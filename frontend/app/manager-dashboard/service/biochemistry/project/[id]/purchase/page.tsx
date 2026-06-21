'use client';
import PurchaseForm from '@/components/projects/PurchaseForm';
import { useParams } from 'next/navigation';

export default function BiochemistryPurchasePage() {
    const params = useParams();
    const projectId = params.id as string;

    return (
        <PurchaseForm
            serviceName="biochemistry"
            backUrl={`/manager-dashboard/service/biochemistry/purchase`}
        />
    );
}
