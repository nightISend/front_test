//对应后端给出单词实体
export type Word = {
  name: string;
  count: number;
  translation: string;
};

//对应后端的单词返回体
export type responseWords = {
  success: boolean;
  condition: string;
  totalPage: number;
  data: Word[];
};

//对应前端给出单词实体
export type requestWords = {
  name: string;
  lowBorder: number;
  upBorder: number;
  translation: string;
  page: number;
};
