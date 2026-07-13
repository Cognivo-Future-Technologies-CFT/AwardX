export interface Resource {
  id: string;
  key: string;
  label: string;
  description: string;
  limit: number;
  unlimited: boolean;
  category: string;
}
