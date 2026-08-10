# XieHe Mobile Expo

新的 React Native + Expo 移动端。当前只包含 Expo Router 应用骨架和
`@xiehe/imaging-core` workspace 连通性验证；现有 `mobile/` KMP 工程保持独立。

`src/infrastructure/http` 已提供共享 Axios 客户端的 Expo composition，令牌通过
`expo-secure-store` 保存。设置 `EXPO_PUBLIC_API_URL` 后即可由后续登录流程创建
API 基础设施；当前骨架尚未接入登录 UI。

```bash
npm install
npm run start --workspace @xiehe/mobile-expo
```
