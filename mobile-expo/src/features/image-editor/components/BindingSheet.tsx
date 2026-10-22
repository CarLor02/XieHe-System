import { useState } from 'react';
import { Text } from 'react-native';
import type { PointRef } from '@xiehe/imaging-core/bindings';
import {
  Button,
  Card,
  Choice,
  ChoiceSheet,
  Notice,
  SectionTitle,
} from '../../../shared/ui';
import { layout } from '../../../shared/theme';
import type { ImageEditorSession } from '../application/ImageEditorSession';

export function BindingSheet({
  session,
  onClose,
}: {
  session: ImageEditorSession;
  onClose: () => void;
}) {
  const [points, setPoints] = useState<PointRef[]>([]);
  const snapshot = session.snapshot;
  const locked = !session.editable;
  return (
    <ChoiceSheet open title="共享点位绑定" onClose={onClose}>
      <Notice>
        医学共享点位自动按解剖规则同步。这里可手动选择测量点，绑定后向最后选择的点对齐；保存后跨端生效。
      </Notice>
      {snapshot?.pointBindings.syncGroups.map(group => (
        <Card key={group.id}>
          <Text style={layout.heading}>{group.name}</Text>
          <Text style={layout.muted}>{group.members.length} 个点位</Text>
          <Button
            title="解除此组绑定"
            variant="secondary"
            disabled={locked}
            onPress={() => session.removeBinding(group.id)}
          />
        </Card>
      ))}
      {!!snapshot?.pointBindings.syncGroups.length && (
        <Button
          title="解除全部手动绑定"
          variant="danger"
          disabled={locked}
          onPress={() => session.removeBinding()}
        />
      )}
      <SectionTitle title={`选择点位 · 已选 ${points.length}`} />
      {snapshot?.measurements.map(measurement => (
        <Card key={measurement.id}>
          <Text style={layout.heading}>{measurement.type}</Text>
          {measurement.points.map((point, index) => (
            <Choice
              key={index}
              title={`点 ${index + 1} · (${point.x.toFixed(1)}, ${point.y.toFixed(1)})`}
              selected={points.some(
                ref =>
                  ref.annotationId === measurement.id &&
                  ref.pointIndex === index
              )}
              onPress={() => {
                if (locked) return;
                setPoints(current =>
                  current.some(
                    ref =>
                      ref.annotationId === measurement.id &&
                      ref.pointIndex === index
                  )
                    ? current.filter(
                        ref =>
                          ref.annotationId !== measurement.id ||
                          ref.pointIndex !== index
                      )
                    : [
                        ...current,
                        { annotationId: measurement.id, pointIndex: index },
                      ]
                );
              }}
            />
          ))}
        </Card>
      ))}
      <Button
        title="建立点位绑定"
        disabled={locked || points.length < 2}
        onPress={() => {
          if (session.bindPoints(points)) {
            setPoints([]);
            onClose();
          }
        }}
      />
    </ChoiceSheet>
  );
}
