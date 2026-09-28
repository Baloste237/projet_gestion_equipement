import axios from "axios";
import jwt from "jsonwebtoken";
import { throwError } from "../errors/throw-error";

const assignmentServiceApi = axios.create({
  baseURL: process.env.ASSIGNMENT_SERVICE_URL || "http://localhost:4004/api",
  timeout: 30000,
});

// Jeton de service éphémère, limité à la lecture des affectations
const serviceToken = () =>
  jwt.sign(
    { userId: "inventory-service", role: "SERVICE", permissions: ["assignment:read"] },
    process.env.JWT_SECRET || "default_jwt_secret",
    { expiresIn: "5m" }
  );

export const assignmentServiceClient = {
  getAllAssignments: async () => {
    try {
      const response = await assignmentServiceApi.get(`/assignments`, {
        headers: { Authorization: `Bearer ${serviceToken()}` },
      });
      return response.data.data;
    } catch (err) {
      throwError("ASSIGNMENT_SERVICE_UNAVAILABLE");
    }
  },
};
