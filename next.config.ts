import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native/ONNX modules must stay outside the bundler.
  serverExternalPackages: ["onnxruntime-node", "fastembed", "pdf-parse", "mammoth"],
};

export default nextConfig;
