import axios from "axios";
import { throwError } from "../errors/throw-error";

const equipmentServiceApi = axios.create({
  baseURL: process.env.EQUIPMENT_SERVICE_URL,
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

  getAllEquipments: async () => {
    try {
      const response = await equipmentServiceApi.get(`/equipments`);
      return response.data.data;
    } catch (err) {
      throwError("EQUIPMENT_SERVICE_UNAVAILABLE");
    }
  },
};
