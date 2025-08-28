import { Request, Response, NextFunction } from "express";
import Equipment from "./equipment.model";
import { S3Service } from "../../services/s3.service";
import type { JwtPayload } from "../../middleware/auth";

export class EquipmentController {
  // Xem thông tin chi tiết một thiết bị
  static async getEquipmentById(req: Request & { user?: JwtPayload }, res: Response, next: NextFunction) {
    try {
      const { equipmentId } = req.params;
      
      const equipment = await Equipment.findById(equipmentId)
        .populate('gym', 'name address')
        .populate('createdBy', 'name email')
        .lean();
      
      if (!equipment) {
        return res.status(404).json({ message: "Thiết bị không tồn tại" });
      }
      
      res.json(equipment);
    } catch (err) {
      next(err);
    }
  }

  // Cập nhật thông tin thiết bị
  static async updateEquipment(req: Request & { user?: JwtPayload }, res: Response, next: NextFunction) {
    try {
      const { equipmentId } = req.params;
      const { name, category, brand, status, meta } = req.body;
      
      const equipment = await Equipment.findById(equipmentId);
      
      if (!equipment) {
        return res.status(404).json({ message: "Thiết bị không tồn tại" });
      }
      
      // Cập nhật thông tin
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (category !== undefined) updateData.category = category;
      if (brand !== undefined) updateData.brand = brand;
      if (status !== undefined) updateData.status = status;
      if (meta !== undefined) updateData.meta = meta;
      
      const updatedEquipment = await Equipment.findByIdAndUpdate(
        equipmentId,
        updateData,
        { new: true, runValidators: true }
      ).populate('gym', 'name address');
      
      res.json({
        message: "Cập nhật thiết bị thành công",
        equipment: updatedEquipment
      });
    } catch (err) {
      next(err);
    }
  }

  // Xóa thiết bị
  static async deleteEquipment(req: Request & { user?: JwtPayload }, res: Response, next: NextFunction) {
    try {
      const { equipmentId } = req.params;
      
      const equipment = await Equipment.findById(equipmentId);
      
      if (!equipment) {
        return res.status(404).json({ message: "Thiết bị không tồn tại" });
      }
      
      // Xóa tất cả ảnh từ S3 trước khi xóa thiết bị
      if (equipment.s3Images && equipment.s3Images.length > 0) {
        for (const image of equipment.s3Images) {
          try {
            await S3Service.deleteFile(image.key);
          } catch (s3Error) {
            console.error(`Lỗi khi xóa ảnh từ S3: ${image.key}`, s3Error);
          }
        }
      }
      
      // Xóa thiết bị khỏi database
      await Equipment.findByIdAndDelete(equipmentId);
      
      res.json({ message: "Xóa thiết bị thành công" });
    } catch (err) {
      next(err);
    }
  }

  // Cập nhật trạng thái thiết bị
  static async updateEquipmentStatus(req: Request & { user?: JwtPayload }, res: Response, next: NextFunction) {
    try {
      const { equipmentId } = req.params;
      const { status } = req.body;
      
      if (!["ACTIVE", "MAINTENANCE", "RETIRED"].includes(status)) {
        return res.status(400).json({ message: "Trạng thái không hợp lệ" });
      }
      
      const equipment = await Equipment.findByIdAndUpdate(
        equipmentId,
        { status },
        { new: true, runValidators: true }
      ).populate('gym', 'name address');
      
      if (!equipment) {
        return res.status(404).json({ message: "Thiết bị không tồn tại" });
      }
      
      res.json({
        message: "Cập nhật trạng thái thiết bị thành công",
        equipment
      });
    } catch (err) {
      next(err);
    }
  }

  // Tìm kiếm thiết bị theo tên hoặc danh mục
  static async searchEquipment(req: Request & { user?: JwtPayload }, res: Response, next: NextFunction) {
    try {
      const { gymId } = req.params;
      const { q, category, status, brand } = req.query;
      
      const filter: any = { gym: gymId };
      
      if (q) {
        filter.$or = [
          { name: { $regex: q, $options: 'i' } },
          { brand: { $regex: q, $options: 'i' } }
        ];
      }
      
      if (category) {
        filter.category = category;
      }
      
      if (status) {
        filter.status = status;
      }
      
      if (brand) {
        filter.brand = { $regex: brand, $options: 'i' };
      }
      
      const equipment = await Equipment.find(filter)
        .populate('gym', 'name address')
        .sort({ createdAt: -1 })
        .lean();
      
      res.json(equipment);
    } catch (err) {
      next(err);
    }
  }
}

