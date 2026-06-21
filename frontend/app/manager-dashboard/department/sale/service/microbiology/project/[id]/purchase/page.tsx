'use client';
import PurchaseForm from '@/components/projects/PurchaseForm';
import { useParams, usePathname } from 'next/navigation';

export default function MicrobiologyProjectPurchasePage() {
    const params = useParams();
    const pathname = usePathname();
    const projectId = params.id as string;

    // Path: /manager-dashboard/department/sale/service/microbiology/project/[id]/purchase
    const backUrl = pathname.split('/').slice(0, 7).join('/') + '/purchase';

    return (
        <PurchaseForm
            serviceName="microbiology"
            backUrl={backUrl}
        />
    );
}
