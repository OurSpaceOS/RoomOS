import { useRef, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api";

const useSync = () => {
    const queryClient = useQueryClient();
    const lastSyncStatus = useRef({});

    const { data: syncStatus, refetch } = useQuery({
        queryKey: ["sync-status"],
        queryFn: () => api.post("/sync/status").then((res) => res?.status || {}),
        refetchInterval: 120000, // 120 seconds
        staleTime: 120000, // 2 minutes - prevents re-check on immediate page switch
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });

    useEffect(() => {
        if (!syncStatus) return;

        const prev = lastSyncStatus.current;
        if (Object.keys(prev).length === 0) {
            // First load, just save
            lastSyncStatus.current = syncStatus;
            return;
        }

        // 1. Transactions Check
        if (
            syncStatus.transactions?.count !== prev.transactions?.count ||
            syncStatus.transactions?.last_created !== prev.transactions?.last_created
        ) {
            console.log("Sync: Transactions updated");
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
            // Invalidate balance/budget related queries too
            queryClient.invalidateQueries({ queryKey: ["budget-stats"] });
        }

        // 2. Budget Check
        if (
            syncStatus.budget?.monthly_budget !== prev.budget?.monthly_budget ||
            syncStatus.budget?.last_income !== prev.budget?.last_income
        ) {
            console.log("Sync: Budget updated");
            queryClient.invalidateQueries({ queryKey: ["budget-stats"] });
        }

        // 3. Maid Settings Check
        if (
            syncStatus.maid_settings &&
            prev.maid_settings &&
            syncStatus.maid_settings !== prev.maid_settings
        ) {
            console.log("Sync: Maid settings updated");
            queryClient.invalidateQueries({ queryKey: ["maidConfig"] });
            queryClient.invalidateQueries({ queryKey: ["maidAtt"] });
        }

        // 4. Notifications Check
        if (
            syncStatus.notifications?.total_count !== prev.notifications?.total_count ||
            syncStatus.notifications?.last_created !== prev.notifications?.last_created
        ) {
            console.log("Sync: Notifications updated");
            queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }

        // 5. Schedule/Roster Check (Class Schedule)
        if (syncStatus.schedule !== prev.schedule) {
            console.log("Sync: Class Schedule updated");
            queryClient.invalidateQueries({ queryKey: ["schedule"] });
        }

        // 6. Chat Check
        if (syncStatus.chat !== prev.chat) {
            console.log("Sync: Chat updated");
            queryClient.invalidateQueries({ queryKey: ["chatConversations"] });
            queryClient.invalidateQueries({ queryKey: ["chatGroup"] });
            queryClient.invalidateQueries({ queryKey: ["chatDm"] });
        }

        // 7. Auto Debits Check
        if (syncStatus.auto_debits !== prev.auto_debits) {
            console.log("Sync: Auto Debits updated");
            queryClient.invalidateQueries({ queryKey: ["autodebits"] });
        }

        // 8. Roster Check (Duty Roster)
        if (syncStatus.roster !== prev.roster) {
            console.log("Sync: Roster updated");
            queryClient.invalidateQueries({ queryKey: ["roster-week"] });
            queryClient.invalidateQueries({ queryKey: ["roster-today"] });
        }

        // 9. Members Check
        if (
            syncStatus.members?.count !== prev.members?.count ||
            syncStatus.members?.last_join !== prev.members?.last_join
        ) {
            console.log("Sync: Members updated");
            queryClient.invalidateQueries({ queryKey: ["group-members"] });
            queryClient.invalidateQueries({ queryKey: ["members"] });
        }

        // Update ref
        lastSyncStatus.current = syncStatus;
    }, [syncStatus, queryClient]);

    const refresh = useCallback(() => {
        return refetch();
    }, [refetch]);

    return { refresh };
};

export default useSync;
