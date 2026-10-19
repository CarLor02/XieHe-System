import { createXieheApiSdk } from '@xiehe/api-sdk';
import { http } from './clients';

/** Web 平台的 API SDK 组合根；业务模块不再自行维护 endpoint 路径。 */
export const apiSdk = createXieheApiSdk({ http });
