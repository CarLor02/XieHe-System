import PatientDetail from './PatientDetail';

export async function generateStaticParams() {
  return [
    { id: '1' },
    { id: '2' },
    { id: '3' },
    { id: '4' },
    { id: '5' },
  ];
}

export default function PatientDetailPage({ params }: { params: { id: string } }) {
  return <PatientDetail patientId={params.id} />;
}