# Cấu hình AWS S3 cho Gym AI Assistant

## 1. Tạo AWS S3 Bucket

1. Đăng nhập vào AWS Console
2. Tạo S3 bucket mới với tên duy nhất
3. Cấu hình bucket để public access (nếu cần)
4. Ghi nhớ tên bucket và region

## 2. Tạo IAM User

1. Vào IAM Service
2. Tạo user mới với quyền truy cập programmatic
3. Gán policy `AmazonS3FullAccess` hoặc tạo custom policy với quyền:
   - s3:PutObject
   - s3:GetObject
   - s3:DeleteObject
   - s3:PutObjectAcl

## 3. Cấu hình Environment Variables

Thêm các biến sau vào file `.env`:

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your_s3_bucket_name
```

## 4. Cấu hình CORS cho S3 Bucket

Thêm CORS policy sau vào S3 bucket:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": []
    }
]
```

## 5. Kiểm tra hoạt động

Sau khi cấu hình xong, bạn có thể test các API:

- `POST /equipment/gyms/:gymId/with-image` - Upload ảnh đơn giản
- `POST /equipment/gyms/:gymId/auto-add` - Upload ảnh + AI phân loại
- `DELETE /equipment/:equipmentId/images/:imageIndex` - Xóa ảnh

## Lưu ý bảo mật

- Không commit file `.env` vào git
- Sử dụng IAM role thay vì access key nếu deploy lên EC2
- Giới hạn quyền truy cập S3 bucket theo nhu cầu thực tế
