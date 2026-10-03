export type Category = "mobile" | "device" | "story";
export type Judge = {
  id: string;
  name: string;
  username: string;
  active: boolean;
};
export type Photo = {
  id: string;
  image_url: string;
  original_url?: string | null;
  image_order: number;
};
export type Entry = {
  id: string;
  serial: string;
  participant_name: string;
  title: string;
  category: Category;
  image_url: string | null;
  original_url?: string | null;
  story_images: Photo[];
};
export type Score = {
  judge_id?: string;
  entry_id: string;
  score: number | null;
  remark: string;
  updated_at?: string;
};
export type Dataset = { entries: Entry[]; scores: Score[]; judges?: Judge[] };
export const categories: { id: Category; name: string; description: string }[] =
  [
    {
      id: "mobile",
      name: "Mobile",
      description: "A different perspective, captured on a phone.",
    },
    {
      id: "device",
      name: "Device",
      description: "Moments captured through the lens.",
    },
    {
      id: "story",
      name: "Story",
      description: "A sequence of photographs. One complete story.",
    },
  ];
