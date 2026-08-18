import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getS3 } from "../config/s3.js";

export const getFromS3 = (key, expiresIn = 24 * 60 * 60, downloadFilename, contentType = "application/pdf") => getSignedUrl(
  getS3(),
  new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    ...(downloadFilename ? {
      ResponseContentDisposition: `attachment; filename="${downloadFilename}"`,
      ResponseContentType: contentType,
    } : {}),
  }),
  { expiresIn },
);
