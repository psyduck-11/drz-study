export interface Subject {
  id: string;
  name: string;
  created_at?: string;
}

export interface Source {
  id: string;
  subject_id: string;
  file_name: string;
  file_url: string;
  created_at?: string;
}

export interface WikiSection {
  id: string;
  subject_id: string;
  title: string;
  order_index: number;
  content_markdown: string;
  updated_at?: string;
}

export interface CroppedIllustration {
  page_number: number;
  caption: string;
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0-1000
  image_url?: string;
}

export interface IngestActionItem {
  action: 'CREATE' | 'APPEND';
  target_section_id?: string;
  title: string;
  content_markdown: string;
  illustrations?: CroppedIllustration[];
  mermaid_code?: string;
}

export interface IngestResponse {
  success: boolean;
  actions: IngestActionItem[];
  error?: string;
}
