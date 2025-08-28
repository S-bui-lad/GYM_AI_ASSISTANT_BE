import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import Equipment from "../equipment/equipment.model";
import { auth } from "../../middleware/auth";
import type { JwtPayload } from "../../middleware/auth";
import { requireRole } from "../../middleware/roles";
import { requireGymManager } from "../../middleware/requireGymManager";
import { callAIClassify } from "../../services/ai.service";
import { S3Service } from "../../services/s3.service";

// Cấu hình multer để lưu file vào memory thay vì disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // Giới hạn 5MB
  },
  fileFilter: (req, file, cb) => {
    // Chỉ cho phép upload ảnh
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ cho phép upload file ảnh'));
    }
  }
});
const r = Router();

// add equipment manually
r.post("/gyms/:gymId", auth(), requireRole("MANAGER"), requireGymManager, async (req: Request & { user?: JwtPayload }, res: Response, next: NextFunction) => {
  try {
    const { gymId } = req.params;
    const { name, category, brand, meta } = req.body;
    const doc = await Equipment.create({
      gym: gymId,
      name, category, brand, meta,
      createdBy: req.user!.sub
    });
    res.json(doc);
  } catch (err) { next(err); }
});

// add equipment with image upload (no AI)
r.post("/gyms/:gymId/with-image", auth(), requireRole("MANAGER"), requireGymManager, upload.single("image"), async (req: Request & { user?: JwtPayload }, res: Response, next: NextFunction) => {
  try {
    const { gymId } = req.params;
    const { name, category, brand, meta } = req.body;
    const file = (req as any).file as Express.Multer.File | undefined;
    
    let s3Result = null;
    let imageUrl = "";
    
    if (file) {
      // Upload ảnh lên S3
      s3Result = await S3Service.uploadFile(file, 'equipment');
      imageUrl = s3Result.url;
    }

    const doc = await Equipment.create({
      gym: gymId,
      name, 
      category, 
      brand, 
      meta,
      images: file ? [imageUrl] : [],
      s3Images: file ? [s3Result] : [],
      createdBy: req.user!.sub
    });
    
    res.json({ created: doc, s3Result });
  } catch (err) { next(err); }
});

// add equipment by image + AI
r.post("/gyms/:gymId/auto-add", auth(), requireRole("MANAGER"), requireGymManager, upload.single("image"), async (req: Request & { user?: JwtPayload }, res: Response, next: NextFunction) => {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ message: "Image required" });
    
    // Upload ảnh lên S3
    const s3Result = await S3Service.uploadFile(file, 'equipment');
    
    // Gọi AI để phân loại (cần cập nhật AI service để nhận buffer)
    const ai = await callAIClassify(file.buffer);
    
    const doc = await Equipment.create({
      gym: req.params.gymId,
      name: ai.label || file.originalname,
      category: ai.category,
      brand: ai.brand,
      images: [s3Result.url], // Lưu URL S3
      s3Images: [s3Result], // Lưu thông tin S3 chi tiết
      meta: { aiConfidence: ai.confidence, ...ai.meta },
      createdBy: req.user!.sub
    });
    
    res.json({ created: doc, ai, s3Result });
  } catch (err) { next(err); }
 });

// list equipment in gym
r.get("/gyms/:gymId", auth(false), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { gymId } = req.params;
    const list = await Equipment.find({ gym: gymId }).lean();
    res.json(list);
  } catch (err) { next(err); }
});

// delete equipment image from S3
r.delete("/:equipmentId/images/:imageIndex", auth(), requireRole("MANAGER"), async (req: Request & { user?: JwtPayload }, res: Response, next: NextFunction) => {
  try {
    const { equipmentId, imageIndex } = req.params;
    const equipment = await Equipment.findById(equipmentId);
    
    if (!equipment) {
      return res.status(404).json({ message: "Equipment not found" });
    }
    
    if (!equipment.s3Images || equipment.s3Images.length === 0) {
      return res.status(400).json({ message: "No images to delete" });
    }
    
    const index = parseInt(imageIndex);
    if (index < 0 || index >= equipment.s3Images.length) {
      return res.status(400).json({ message: "Invalid image index" });
    }
    
    const imageToDelete = equipment.s3Images[index];
    
    // Xóa ảnh từ S3
    await S3Service.deleteFile(imageToDelete.key);
    
    // Xóa ảnh khỏi database
    equipment.s3Images.splice(index, 1);
    equipment.images.splice(index, 1);
    await equipment.save();
    
    res.json({ message: "Image deleted successfully", equipment });
  } catch (err) { next(err); }
});

// Xem thông tin chi tiết một thiết bị
r.get("/:equipmentId", auth(false), async (req: Request, res: Response, next: NextFunction) => {
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
  } catch (err) { next(err); }
});

// Cập nhật thông tin thiết bị
r.put("/:equipmentId", auth(), requireRole("MANAGER"), async (req: Request & { user?: JwtPayload }, res: Response, next: NextFunction) => {
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
  } catch (err) { next(err); }
});

// Cập nhật trạng thái thiết bị
r.patch("/:equipmentId/status", auth(), requireRole("MANAGER"), async (req: Request & { user?: JwtPayload }, res: Response, next: NextFunction) => {
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
  } catch (err) { next(err); }
});

// Xóa thiết bị
r.delete("/:equipmentId", auth(), requireRole("MANAGER"), async (req: Request & { user?: JwtPayload }, res: Response, next: NextFunction) => {
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
  } catch (err) { next(err); }
});

// Tìm kiếm thiết bị theo tên hoặc danh mục
r.get("/gyms/:gymId/search", auth(false), async (req: Request, res: Response, next: NextFunction) => {
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
  } catch (err) { next(err); }
});

export default r;
