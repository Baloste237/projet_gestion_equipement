import { positionRepository } from "../Repositories/position.repository";

export const positionService = {
  getAll: (departmentId?: string) => positionRepository.findAll(departmentId),
  getById: async (id: string) => {
    const position = await positionRepository.findById(id);
    if (!position) throw new Error("POSITION_NOT_FOUND");
    return position;
  },
};
