import EditPatient from './EditPatient';

export async function generateStaticParams() {
  return [
    { id: '1' },
    { id: '2' },
    { id: '3' },
    { id: '4' },
    { id: '5' },
  ];
}

export default function EditPatientPage({ params }: { params: { id: string } }) {
  return <EditPatient patientId={params.id} />;
}