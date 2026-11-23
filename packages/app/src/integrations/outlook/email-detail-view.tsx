import { useQuery } from "@tanstack/react-query";
import { EmailDetailBody } from "#/components/mail/email-detail";
import { QueryState } from "#/components/widget-kit/query-state";
import { outlookQueries } from "./queries";

/** Detail modal body for an email (`detailRef` = Graph message id). */
export function OutlookEmailDetailView({ detailRef }: { detailRef: string }) {
	const query = useQuery(outlookQueries.message(detailRef));
	return (
		<QueryState query={query}>
			{(mail) => <EmailDetailBody mail={mail} />}
		</QueryState>
	);
}
