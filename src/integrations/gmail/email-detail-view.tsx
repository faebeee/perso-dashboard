import { useQuery } from "@tanstack/react-query";
import { EmailDetailBody } from "#/components/mail/email-detail";
import { QueryState } from "#/components/widget-kit/query-state";
import { gmailQueries } from "./queries";

/** Detail modal body for an email (`detailRef` = Gmail message id). */
export function EmailDetailView({ detailRef }: { detailRef: string }) {
	const query = useQuery(gmailQueries.message(detailRef));
	return (
		<QueryState query={query}>
			{(mail) => <EmailDetailBody mail={mail} />}
		</QueryState>
	);
}
