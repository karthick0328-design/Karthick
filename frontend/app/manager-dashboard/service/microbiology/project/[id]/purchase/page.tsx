'use client';
import PurchaseForm from '@/components/projects/PurchaseForm';
import { useParams } from 'next/navigation';

export default function MicrobiologyPurchasePage() {
    const params = useParams();
    const projectId = params.id as string;

    return (
        <PurchaseForm
            serviceName="microbiology"
            backUrl={`/manager-dashboard/service/microbiology/purchase`}
        />
    );
}
