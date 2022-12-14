import mongoose from "mongoose";

export interface questionInputType {
  title: string;
  score: number;
  options: {
    title: string;
    isCorrect: boolean;
  }[];
}

export interface questionDocument extends questionInputType, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}
