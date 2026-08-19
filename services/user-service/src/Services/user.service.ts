import { userRepository } from "../Repositories/user.repository";
import {
  CreateUserDTO,
  UpdateProfileDTO,
  UpdateRoleDTO,
} from "../Types/user.type";

export const userService = {
  create: (data: CreateUserDTO) => userRepository.create(data),

  getAll: () => userRepository.findAll(),

  getById: async (id: string) => {
    const user = await userRepository.findById(id);
    if (!user) throw new Error("USER_NOT_FOUND");
    return user;
  },

  updateProfile: async (id: string, data: UpdateProfileDTO) => {
    const user = await userRepository.findById(id);
    if (!user) throw new Error("USER_NOT_FOUND");
    if (!user.isActive) throw new Error("USER_DEACTIVATED");
    return userRepository.update(id, data);
  },

  updateRole: async (id: string, data: UpdateRoleDTO) => {
    const user = await userRepository.findById(id);
    if (!user) throw new Error("USER_NOT_FOUND");
    return userRepository.update(id, data);
  },

  deactivate: async (id: string) => {
    const user = await userRepository.findById(id);
    if (!user) throw new Error("USER_NOT_FOUND");
    if (!user.isActive) throw new Error("USER_ALREADY_DEACTIVATED");
    return userRepository.update(id, {
      isActive: false,
      deactivatedAt: new Date(),
    });
  },

  reactivate: async (id: string) => {
    const user = await userRepository.findById(id);
    if (!user) throw new Error("USER_NOT_FOUND");
    return userRepository.update(id, {
      isActive: true,
      deactivatedAt: null,
    });
  },

  delete: async (id: string) => {
    const user = await userRepository.findById(id);
    if (!user) throw new Error("USER_NOT_FOUND");
    return userRepository.delete(id);
  },
};
