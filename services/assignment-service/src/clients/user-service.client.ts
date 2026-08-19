import axios from "axios";
import { throwError } from "../errors/throw-error";

const userServiceApi = axios.create({
  baseURL: process.env.USER_SERVICE_URL || "http://localhost:4002/api",
  timeout: 5000,
});

export const userServiceClient = {
  getUserById: async (userId: string) => {
    try {
      const response = await userServiceApi.get(`/users/${userId}`);
      return response.data.data;
    } catch (err: any) {
      if (err.response?.status === 404) throwError("USER_NOT_FOUND");
      throwError("USER_SERVICE_UNAVAILABLE");
    }
  },
};
