import {useEffect} from "react";
import { getImageFiles } from '@/services/imageServices';

export function useImageListFetcher(setImageList:(imageIdList: string[]) => void) {
    async function fetchImageList(){
        try {
            const result = await getImageFiles({
                page: 1,
                page_size: 100,
            });

            // 从API响应中提取影像ID，格式为IMG{id}
            const ids = result.items.map((item: any) => {
                // 使用item.id来生成影像ID
                return `IMG${item.id.toString().padStart(3, '0')}`;
            });
            setImageList(ids);
        } catch (error) {
            console.error('获取影像列表失败:', error);
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
