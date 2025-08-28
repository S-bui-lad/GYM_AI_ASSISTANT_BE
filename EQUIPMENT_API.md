# Equipment API Documentation

## Tổng quan
API quản lý thiết bị gym với các chức năng CRUD cơ bản và quản lý ảnh.

## Base URL
```
/equipment
```

## Authentication
- Các API yêu cầu quyền MANAGER được bảo vệ bởi middleware `requireRole("MANAGER")`
- Các API xem thông tin có thể truy cập không cần đăng nhập (`auth(false)`)

## API Endpoints

### 1. Xem thông tin chi tiết một thiết bị
**GET** `/equipment/:equipmentId`

**Mô tả:** Lấy thông tin chi tiết của một thiết bị cụ thể

**Quyền truy cập:** Không cần đăng nhập

**Response:**
```json
{
  "_id": "equipment_id",
  "gym": {
    "_id": "gym_id",
    "name": "Tên gym",
    "address": "Địa chỉ gym"
  },
  "name": "Tên thiết bị",
  "category": "Danh mục",
  "brand": "Thương hiệu",
  "status": "ACTIVE|MAINTENANCE|RETIRED",
  "images": ["url_ảnh"],
  "s3Images": [{
    "url": "url_s3",
    "key": "key_s3",
    "bucket": "bucket_name"
  }],
  "meta": {},
  "createdBy": {
    "_id": "user_id",
    "name": "Tên người tạo",
    "email": "email@example.com"
  },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### 2. Cập nhật thông tin thiết bị
**PUT** `/equipment/:equipmentId`

**Mô tả:** Cập nhật thông tin của một thiết bị

**Quyền truy cập:** MANAGER

**Request Body:**
```json
{
  "name": "Tên thiết bị mới",
  "category": "Danh mục mới",
  "brand": "Thương hiệu mới",
  "status": "ACTIVE|MAINTENANCE|RETIRED",
  "meta": {}
}
```

**Response:**
```json
{
  "message": "Cập nhật thiết bị thành công",
  "equipment": {
    // Thông tin thiết bị đã cập nhật
  }
}
```

### 3. Cập nhật trạng thái thiết bị
**PATCH** `/equipment/:equipmentId/status`

**Mô tả:** Cập nhật trạng thái của một thiết bị

**Quyền truy cập:** MANAGER

**Request Body:**
```json
{
  "status": "MAINTENANCE"
}
```

**Trạng thái hợp lệ:** `ACTIVE`, `MAINTENANCE`, `RETIRED`

**Response:**
```json
{
  "message": "Cập nhật trạng thái thiết bị thành công",
  "equipment": {
    // Thông tin thiết bị đã cập nhật
  }
}
```

### 4. Xóa thiết bị
**DELETE** `/equipment/:equipmentId`

**Mô tả:** Xóa một thiết bị và tất cả ảnh liên quan từ S3

**Quyền truy cập:** MANAGER

**Response:**
```json
{
  "message": "Xóa thiết bị thành công"
}
```

### 5. Tìm kiếm thiết bị
**GET** `/equipment/gyms/:gymId/search`

**Mô tả:** Tìm kiếm thiết bị trong một gym theo các tiêu chí

**Quyền truy cập:** Không cần đăng nhập

**Query Parameters:**
- `q`: Từ khóa tìm kiếm (tên hoặc thương hiệu)
- `category`: Lọc theo danh mục
- `status`: Lọc theo trạng thái
- `brand`: Lọc theo thương hiệu

**Ví dụ:**
```
GET /equipment/gyms/123/search?q=treadmill&status=ACTIVE
```

**Response:**
```json
[
  {
    "_id": "equipment_id",
    "name": "Treadmill Pro",
    "category": "Cardio",
    "brand": "Life Fitness",
    "status": "ACTIVE",
    // ... các thông tin khác
  }
]
```

### 6. Danh sách thiết bị trong gym
**GET** `/equipment/gyms/:gymId`

**Mô tả:** Lấy danh sách tất cả thiết bị trong một gym

**Quyền truy cập:** Không cần đăng nhập

### 7. Thêm thiết bị thủ công
**POST** `/equipment/gyms/:gymId`

**Mô tả:** Thêm thiết bị mới vào gym

**Quyền truy cập:** MANAGER

### 8. Thêm thiết bị với ảnh
**POST** `/equipment/gyms/:gymId/with-image`

**Mô tả:** Thêm thiết bị mới với ảnh upload

**Quyền truy cập:** MANAGER

### 9. Thêm thiết bị tự động bằng AI
**POST** `/equipment/gyms/:gymId/auto-add`

**Mô tả:** Thêm thiết bị tự động bằng AI phân tích ảnh

**Quyền truy cập:** MANAGER

### 10. Xóa ảnh thiết bị
**DELETE** `/equipment/:equipmentId/images/:imageIndex`

**Mô tả:** Xóa một ảnh cụ thể của thiết bị

**Quyền truy cập:** MANAGER

## Error Responses

### 404 - Không tìm thấy
```json
{
  "message": "Thiết bị không tồn tại"
}
```

### 400 - Dữ liệu không hợp lệ
```json
{
  "message": "Trạng thái không hợp lệ"
}
```

### 401 - Không có quyền truy cập
```json
{
  "message": "Unauthorized"
}
```

### 403 - Không đủ quyền
```json
{
  "message": "Forbidden"
}
```

## Lưu ý
- Khi xóa thiết bị, tất cả ảnh liên quan sẽ được xóa khỏi S3
- API cập nhật chỉ cập nhật các trường được gửi trong request body
- Tìm kiếm hỗ trợ regex không phân biệt chữ hoa/thường
- Tất cả API đều có error handling và validation
