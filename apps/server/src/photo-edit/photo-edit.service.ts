import { Injectable } from "@nestjs/common";
import axios from "axios";
import * as FormData from "form-data";

@Injectable()
export class PhotoEditService {
  async getEditedPhoto(file: Express.Multer.File): Promise<any> {
    try {
      // 파일 버퍼 가져오기
      const fileBuffer = this.preProcessImage(file);

      // EC2 모델 서버 호출
      const editedPhoto = await this.loadModelFromEC2(
        fileBuffer,
        file.originalname
      );

      return editedPhoto;
    } catch (error) {
      console.error("Error in getEditedPhoto: ", error.message);
      throw new Error("Photo edit failed.");
    }
  }

  async loadModelFromEC2(fileBuffer: Buffer, filename: string): Promise<any> {
    try {
      // FormData 생성
      const formData = new FormData();
      formData.append("image", fileBuffer, filename); // 파일 이름을 명시적으로 추가

      console.log("Sending FormData to Flask server...");
      console.log("Headers:", formData.getHeaders());

      // 모델 서버 요청
      const response = await axios.post(
        // "http://3.37.203.103:5001/crop",
        "http://localhost:5001/crop",
        formData,
        {
          headers: formData.getHeaders(), // FormData에서 자동 생성된 헤더 사용
          responseType: "arraybuffer", // 바이너리 데이터로 수신
        }
      );

      return response.data;
    } catch (error) {
      console.error("Error fetching crop from model EC2:", error.message);
      throw new Error("Model inference failed.");
    }
  }

  preProcessImage(file: Express.Multer.File): Buffer {
    console.log(file);
    try {
      // 파일 버퍼 반환
      return file.buffer;
    } catch (error) {
      console.error("Error preprocessing image:", error.message);
      throw new Error("Image preprocessing failed.");
    }
  }
}
