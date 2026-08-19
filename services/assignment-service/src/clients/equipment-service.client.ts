import axios from "axios";
import { throwError } from "../errors/throw-error";

const equipmentServiceApi = axios.create({
  baseURL: process.env.EQUIPMENT_SERVICE_URL || "http://localhost:4003/api",
  timeout: 5000,
});

export const equipmentServiceClient = {
  getEquipmentById: async (equipmentId: string) => {
    try {
      const response = await equipmentServiceApi.get(`/equipments/${equipmentId}`);
      return response.data.data;
    } catch (err: any) {
      if (err.response?.status === 404) throwError("EQUIPMENT_NOT_FOUND");
      throwError("EQUIPMENT_SERVICE_UNAVAILABLE");
    }
  },

  updateEquipmentStatus: async (equipmentId: string, status: string) => {
    try {
      const response = await equipmentServiceApi.patch(`/equipments/${equipmentId}`, { status });
      return response.data.data;
    } catch (err: any) {
      throwError("EQUIPMENT_SERVICE_UNAVAILABLE");
    }
  },
};
