export interface IConvictProps {
  port: number;
  database: {
    url: string;
  };
  aws: {
    region: string;
    endpoint: string; // "" = AWS real; http://localhost:4566 = LocalStack
  };
  storage: {
    bucket: string;
  };
  queue: {
    url: string;
    visibilityTimeoutSeconds: number;
  };
  upload: {
    maxFileSizeMb: number;
  };
  jwt: {
    secret: string;
    expiresIn: string; // formato de jsonwebtoken: "1h", "15m", "7d"
  };
}
