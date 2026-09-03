import { SubscriptionEntitlementQuery } from "@/app/convex/query.config";
import Navbar from "@/components/navbar";
import { combinedSlug } from "@/lib/utils";
import { redirect } from "next/navigation";
import { preloadedQueryResult } from "convex/nextjs";
import React from "react";


type Props= {
    children : React.ReactNode
}

const Layout = async({children} : Props)=> {
    const {profileName ,entitlement}= await SubscriptionEntitlementQuery()

    // TODO: temporarily disabled so the navbar/tabs UI can be previewed
    // without being redirected out — also this redirect target was the
    // same route this layout itself wraps, so it would've sent you right
    // back here anyway (a loop), not somewhere useful like /billing.
    // Re-enable (and fix the target) once billing/entitlement is real.
    // if (!preloadedQueryResult(entitlement)) {
    //     redirect (`/dashboard/${combinedSlug(profileName!)}`)
    // }

    return( 
    <div className="grid grid-cols-1">
        <Navbar/> 
        {children}
        </div>
        )
}

export default Layout
