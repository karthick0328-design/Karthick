'use client';
import PurchaseForm from '@/components/projects/PurchaseForm';
import { useParams } from 'next/navigation';

export default function NGSPurchasePage() {
    const params = useParams();
    const projectId = params.id as string;

    return (
        <PurchaseForm
            serviceName="ngs"
            backUrl={`/manager-dashboard/service/ngs/purchase`}
        />
    );
}
