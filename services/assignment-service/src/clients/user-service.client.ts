import axios from "axios";
import { throwError } from "../errors/throw-error";
import { ErrorCode } from "../errors/error-codes";

const userServiceApi = axios.create({
  baseURL: process.env.USER_SERVICE_URL || "http://localhost:4002/api",
  timeout: 5000,
});

// user-service exige un jeton : les appels de service à service portent le secret interne
userServiceApi.interceptors.request.use((config) => {
  config.headers["x-internal-token"] = process.env.INTERNAL_SERVICE_TOKEN ?? "";
  return config;
});

const fetchResource = async (path: string, notFoundCode: ErrorCode) => {
  try {
    const response = await userServiceApi.get(path);
    return response.data.data;
  } catch (err: any) {
    if (err.response?.status === 404) throwError(notFoundCode);
    throwError("USER_SERVICE_UNAVAILABLE");
  }
};

export const userServiceClient = {
  getUserById: (userId: string) => fetchResource(`/users/${userId}`, "USER_NOT_FOUND"),
  getDepartmentById: (departmentId: string) =>
    fetchResource(`/departments/${departmentId}`, "DEPARTMENT_NOT_FOUND"),
  getPositionById: (positionId: string) =>
    fetchResource(`/positions/${positionId}`, "POSITION_NOT_FOUND"),
};
