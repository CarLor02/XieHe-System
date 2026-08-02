import {useEffect} from "react";
import { getImageNavigationIds } from '@/services/imageServices';
import { createLogger } from '@/lib/logger';

const logger = createLogger('app.imaging.features.image.viewer.features.study.hooks.useImageListFetcher');

export function useImageListFetcher(setImageList:(imageIdList: string[]) => void) {
    async function fetchImageList(){
        try {
            const imageIds = await getImageNavigationIds();
            const ids = imageIds.map(id => `IMG${id.toString().padStart(3, '0')}`);
            setImageList(ids);
        } catch (error) {
            logger.error('获取影像列表失败:', error);
            // 如果获取失败，使用空列表
            setImageList([]);
        }
    }

    useEffect(
        () => {
            void fetchImageList();
        },
        []
    );
}
