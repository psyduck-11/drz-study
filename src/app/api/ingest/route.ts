import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { getVisionModel, getSynthesisModel, checkAIConfig } from '@/lib/ai-provider';

// Zod schema enforcing the strict CREATE / APPEND structure
const IngestExtractionSchema = z.object({
  actions: z.array(
    z.object({
      action: z.enum(['CREATE', 'APPEND']).describe(
        'CREATE if introducing a new chapter/topic, APPEND if expanding upon an existing section.'
      ),
      target_section_id: z.string().optional().describe(
        'Required if action is APPEND. Must match an ID from existing_sections.'
      ),
      title: z.string().describe(
        'Title of the section in Vietnamese (e.g., "1. Khái niệm và Định lý Cơ bản").'
      ),
      content_markdown: z.string().describe(
        'Comprehensive, detailed Vietnamese study notes. Must NOT summarize or truncate. Include derivations, edge cases, formulas in KaTeX ($...$ or $$...$$), Markdown tables, and clean ```mermaid ... ``` code blocks when no visual diagram is in source.'
      ),
      illustrations: z.array(
        z.object({
          page_number: z.number().int().min(1).describe('1-indexed page number where diagram is located'),
          caption: z.string().describe('Concise Vietnamese caption describing the diagram/figure'),
          box_2d: z.array(z.number()).describe('[ymin, xmin, ymax, xmax] coordinates normalized to 0-1000 scale'),
        })
      ).default([]).describe('List of visual diagrams, charts, figures detected on pages'),
    })
  ),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      subjectId,
      fileName,
      pages,
      existingSections = [],
    } = body as {
      subjectId: string;
      fileName: string;
      pages: { pageNumber: number; dataUrl: string }[];
      existingSections: { id: string; title: string; outline?: string }[];
    };

    if (!subjectId || !pages || pages.length === 0) {
      return NextResponse.json(
        { error: 'Thiếu thông tin subjectId hoặc tài liệu trang.' },
        { status: 400 }
      );
    }

    const aiStatus = checkAIConfig();

    // Fallback if AI key not provided yet: provide structured mock so user can test UI
    if (!aiStatus.isConfigured) {
      return NextResponse.json({
        success: true,
        isMock: true,
        message: 'Chưa cấu hình API Key. Đây là dữ liệu mẫu để thử nghiệm giao diện.',
        actions: [
          {
            action: existingSections.length > 0 ? 'APPEND' : 'CREATE',
            target_section_id: existingSections.length > 0 ? existingSections[0].id : undefined,
            title: existingSections.length > 0 ? existingSections[0].title : `Tổng quan từ tệp ${fileName}`,
            content_markdown: `### Kiến thức mới từ tệp **${fileName}**\n\n*[Nguồn: ${fileName} - Trang 1]*\n\nNội dung được trích xuất tự động theo quy tắc **Không-Phá-Hủy (Anti-Truncation)**.\n\n- **Định lý cốt lõi:** $E = mc^2$\n- **Công thức tính tích phân:**\n$$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$\n\n| Khái niệm | Ý nghĩa | Lưu ý kỹ thuật |\n| :--- | :--- | :--- |\n| Section Mới | Tạo mới khi chủ đề độc lập | Giữ nguyên cấu trúc |\n| Bổ sung | Ghép nối vào mục cũ | Không làm mất dữ liệu cũ |\n\n\`\`\`mermaid\ngraph TD\n  A[Tài liệu PDF] --> B[Phân tích Vision AI]\n  B --> C[Tách sơ đồ box_2d]\n  B --> D[Tổng hợp Tri thức Markdown]\n  C --> E[Living Wiki hoàn chỉnh]\n  D --> E\n\`\`\`\n\n> **Ghi chú cấu hình:** Để sử dụng AI thực tế, vui lòng cập nhật \`GOOGLE_GENERATIVE_AI_API_KEY\` hoặc \`OPENAI_API_KEY\` trong tệp \`.env.local\`.`,
            illustrations: [],
          },
        ],
      });
    }

    // Build system instructions
    const systemPrompt = `
Bạn là Trợ lý Tổng hợp Tri thức Chuyên sâu (Living Wiki AI) cho sinh viên và người tự học.
Nhiệm vụ: Đọc kỹ các trang tài liệu (PDF / Hình ảnh) được cung cấp và tổng hợp thành sách giáo trình kỹ thuật số bằng Tiếng Việt.

NGUYÊN TẮC BẮT BUỘC (QUY TẮC ANTI-TRUNCATION - KHÔNG PHÁ HỦY KIẾN THỨC):
1. KHÔNG BAO GIỜ tóm tắt sơ sài, rút gọn hay lược bỏ các chi tiết kỹ thuật, công thức toán, chứng minh, trường hợp biên (edge cases).
2. Kiểm tra danh sách các phần mục hiện có (existing_sections):
   ${JSON.stringify(existingSections, null, 2)}
3. Với mỗi chủ đề phát hiện trong tài liệu:
   - Nếu là chủ đề mới hoặc chương mới: Sử dụng action="CREATE". Tạo tiêu đề rõ ràng, cấu trúc đầy đủ (tiêu đề h2, h3, gạch đầu dòng, bảng biểu, công thức toán KaTeX chuẩn $...$ hoặc $$...$$).
   - Nếu chủ đề mở rộng hoặc làm rõ một mục đã có trong existing_sections: Sử dụng action="APPEND", kèm target_section_id tương ứng. Chỉ sinh NỘI DUNG MỚI BỔ SUNG, bắt đầu bằng ghi chú nguồn *[Nguồn: ${fileName} - Tr. X]*.
4. PHÁT HIỆN HÌNH ẢNH & SƠ ĐỒ (Visual Illustrations):
   - Quan sát kỹ các trang tài liệu. Nếu trên trang có hình vẽ, đồ thị, sơ đồ khối, lưu đồ, biểu đồ hoặc ví dụ minh họa trực quan, hãy xác định vùng bounding box "box_2d" theo thang chuẩn [ymin, xmin, ymax, xmax] từ 0 đến 1000 cùng số trang (page_number: 1, 2, ...).
   - Trong content_markdown, hãy đặt thẻ đánh dấu [HÌNH_MINH_HỌA_1], [HÌNH_MINH_HỌA_2], ... trực tiếp ngay bên dưới đoạn văn/công thức giải thích khái niệm đó để hệ thống nhúng hình ảnh đã cắt vào đúng vị trí.
   - Nếu khái niệm phức tạp nhưng tài liệu không có sẵn hình ảnh minh họa, hãy tạo một đoạn mã Mermaid chuẩn (\`\`\`mermaid ... \`\`\`) chèn vào nội dung markdown.
`.trim();

    // Prepare multimodal user message content with images
    const userContent: Array<
      | { type: 'text'; text: string }
      | { type: 'image'; image: string }
    > = [
      {
        type: 'text',
        text: `Tên tệp: ${fileName}\nSố trang: ${pages.length}\nHãy phân tích toàn bộ tài liệu sau và xuất ra danh sách các hành động CREATE hoặc APPEND tương ứng.`,
      },
    ];

    for (const page of pages) {
      userContent.push({
        type: 'text',
        text: `--- TRANG ${page.pageNumber} ---`,
      });
      userContent.push({
        type: 'image',
        image: page.dataUrl,
      });
    }

    const visionModel = getVisionModel();
    const synthesisModel = getSynthesisModel();
    const isHybrid = process.env.AI_VISION_MODEL !== process.env.AI_SYNTHESIS_MODEL;

    let result;

    if (isHybrid) {
      // STAGE 1: Fast Vision & Diagram Bounding Box Detection (Gemini Flash)
      const VisionDetectionSchema = z.object({
        detected_illustrations: z.array(
          z.object({
            page_number: z.number().int().min(1).describe('1-indexed page number where diagram is located'),
            caption: z.string().describe('Concise Vietnamese caption describing the diagram/figure/chart'),
            box_2d: z.array(z.number()).describe('[ymin, xmin, ymax, xmax] 0-1000 coordinates'),
          })
        ).default([]),
      });

      const visionScanPrompt = `
Bạn là Chuyên gia Thị giác Máy tính (Computer Vision Expert).
Quan sát kỹ tất cả các trang tài liệu.
Nhiệm vụ: Phát hiện TẤT CẢ các hình vẽ, sơ đồ khối, lưu đồ, biểu đồ, đồ thị, hình minh họa trực quan hoặc ví dụ đồ họa.
Với mỗi hình vẽ phát hiện được, hãy trả về số trang (page_number: 1, 2, ...), mô tả ngắn gọn (caption) và bounding box chính xác box_2d: [ymin, xmin, ymax, xmax] chuẩn hóa từ 0 đến 1000.
`.trim();

      const visionScanResult = await generateObject({
        model: visionModel,
        schema: VisionDetectionSchema,
        system: visionScanPrompt,
        messages: [{ role: 'user', content: userContent }],
      });

      const detectedIllustrations = visionScanResult.object.detected_illustrations || [];

      // STAGE 2: Deep Pedagogical Knowledge Synthesis (Gemini Pro)
      const deepSynthesisPrompt = `
Bạn là Trợ lý Tổng hợp Tri thức Chuyên sâu (Living Wiki AI) bậc Giáo sư cho sinh viên và người tự học.
Nhiệm vụ: Đọc tài liệu và tổng hợp thành sách giáo trình kỹ thuật số chuyên sâu bằng Tiếng Việt.

NGUYÊN TẮC BẮT BUỘC (QUY TẮC ANTI-TRUNCATION - KHÔNG PHÁ HỦY KIẾN THỨC):
1. KHÔNG BAO GIỜ tóm tắt sơ sài, rút gọn hay lược bỏ các chi tiết kỹ thuật, công thức toán, chứng minh, trường hợp biên (edge cases). Nội dung phải toàn diện, rõ ràng và có tính sư phạm cao.
2. Kiểm tra danh sách các phần mục hiện có (existing_sections):
   ${JSON.stringify(existingSections, null, 2)}
3. Với mỗi chủ đề phát hiện trong tài liệu:
   - Nếu là chủ đề mới hoặc chương mới: Sử dụng action="CREATE". Tạo tiêu đề rõ ràng, cấu trúc đầy đủ (tiêu đề h2, h3, gạch đầu dòng, bảng biểu, công thức toán KaTeX chuẩn $...$ hoặc $$...$$).
   - Nếu chủ đề mở rộng hoặc làm rõ một mục đã có trong existing_sections: Sử dụng action="APPEND", kèm target_section_id tương ứng. Chỉ sinh NỘI DUNG MỚI BỔ SUNG, bắt đầu bằng ghi chú nguồn *[Nguồn: ${fileName} - Tr. X]*.
4. TÍCH HỢP HÌNH ẢNH & SƠ ĐỒ ĐÃ PHÁT HIỆN:
   Đội ngũ Vision AI đã phát hiện các hình ảnh minh họa sau trong tài liệu:
   ${JSON.stringify(detectedIllustrations, null, 2)}
   - Trong content_markdown, hãy đặt thẻ đánh dấu [HÌNH_MINH_HỌA_1], [HÌNH_MINH_HỌA_2], ... trực tiếp ngay bên dưới đoạn văn/công thức giải thích khái niệm đó để hệ thống nhúng hình ảnh đã cắt vào đúng vị trí.
   - Gán các hình ảnh minh họa tương ứng vào mảng illustrations của từng action.
   - Nếu một khái niệm phức tạp không có hình minh họa từ tài liệu nguồn, hãy chủ động vẽ một sơ đồ Mermaid chuẩn (\`\`\`mermaid ... \`\`\`) minh họa trực quan quy trình/kiến trúc.
`.trim();

      result = await generateObject({
        model: synthesisModel,
        schema: IngestExtractionSchema,
        system: deepSynthesisPrompt,
        messages: [{ role: 'user', content: userContent }],
      });
    } else {
      // Single model execution
      result = await generateObject({
        model: visionModel,
        schema: IngestExtractionSchema,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userContent,
          },
        ],
      });
    }

    return NextResponse.json({
      success: true,
      actions: result.object.actions,
    });
  } catch (error: any) {
    console.error('Lỗi trong /api/ingest:', error);
    return NextResponse.json(
      {
        error: error.message || 'Đã xảy ra lỗi khi tổng hợp tài liệu.',
      },
      { status: 500 }
    );
  }
}
