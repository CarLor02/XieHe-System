import { useCallback } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { useWorkspace } from '../../../application/AppProvider';
import { useResource } from '../../../shared/hooks/useResource';
import {
  Button,
  Card,
  Content,
  EmptyState,
  ErrorState,
  Header,
  IconButton,
  InfoRow,
  LoadingState,
  Screen,
  SectionTitle,
  Tag,
} from '../../../shared/ui';
import { layout } from '../../../shared/theme';
import { ImageCard } from '../../imaging';

export function PatientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { services } = useWorkspace();
  const patientId = Number(id);
  const load = useCallback(
    () => services.patients.get(patientId),
    [services, patientId]
  );
  const imagesLoad = useCallback(
    () => services.imaging.listPatientImages(patientId, 1, 5),
    [services, patientId]
  );
  const resource = useResource(load);
  const images = useResource(imagesLoad);
  const patient = resource.data;
  return (
    <Screen>
      <Header
        title="患者详情"
        subtitle={patient?.patient_id}
        back
        right={
          patient && (
            <IconButton
              name="create-outline"
              label="编辑患者"
              light
              onPress={() =>
                router.push({ pathname: '/patients/edit', params: { id } })
              }
            />
          )
        }
      />
      <Content>
        {resource.loading && !patient && <LoadingState />}
        {!!resource.error && (
          <ErrorState
            message={resource.error}
            onRetry={() => void resource.reload()}
          />
        )}
        {patient && (
          <>
            <Card>
              <View style={layout.between}>
                <Text style={[layout.title, { fontSize: 24 }]}>
                  {patient.name}
                </Text>
                <Tag
                  text={`${patient.gender} · ${patient.age != null ? `${patient.age}岁` : '年龄未填写'}`}
                />
              </View>
              <View style={layout.divider} />
              <InfoRow label="患者编号" value={patient.patient_id} />
              <InfoRow label="出生日期" value={patient.birth_date} />
              <InfoRow label="手机号" value={patient.phone} />
              <InfoRow label="邮箱" value={patient.email} />
              <InfoRow label="联系地址" value={patient.address} />
              <InfoRow
                label="紧急联系人"
                value={patient.emergency_contact_name}
              />
              <InfoRow
                label="紧急联系电话"
                value={patient.emergency_contact_phone}
              />
            </Card>
            {patient.medical_history && (
              <Card>
                <SectionTitle title="既往病史" />
                <Text style={[layout.body, { marginTop: 12 }]}>
                  {patient.medical_history}
                </Text>
              </Card>
            )}
            <SectionTitle
              title={`影像记录${images.data ? ` · ${images.data.total}` : ''}`}
              action="查看全部"
              onPress={() =>
                router.push({
                  pathname: '/patients/images',
                  params: { id, name: patient.name },
                })
              }
            />
            {images.loading && !images.data && <LoadingState />}
            {!!images.error && (
              <ErrorState
                message={images.error}
                onRetry={() => void images.reload()}
              />
            )}
            {images.data?.items.map(image => (
              <ImageCard key={image.id} image={image} compact />
            ))}
            {images.data?.total === 0 && (
              <EmptyState
                title="还没有影像记录"
                description="为这位患者上传第一份检查影像"
                icon="images-outline"
              />
            )}
            <Button
              title="为患者上传影像"
              icon="cloud-upload-outline"
              onPress={() =>
                router.push({
                  pathname: '/images/upload',
                  params: { patientId: id, patientName: patient.name },
                })
              }
            />
          </>
        )}
      </Content>
    </Screen>
  );
}
