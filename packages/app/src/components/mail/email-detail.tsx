import type { EmailAddress, EmailDetail } from "@dashboard/core/email";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import { ImageOff, Paperclip } from "lucide-react";
import { useState } from "react";
import {
	Meta,
	MetaGrid,
	PersonChip,
} from "#/components/item-detail/detail-kit";
import { SafeHtmlFrame } from "#/components/item-detail/safe-html-frame";
import { formatRelative } from "#/lib/time";

const fullDate = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
	timeStyle: "short",
});

/** Body of the email detail modal, for any mail provider. */
export function EmailDetailBody({ mail }: { mail: EmailDetail }) {
	// Remote images can track that you opened the mail: off until asked.
	const [showImages, setShowImages] = useState(false);

	return (
		<div>
			<div className="mb-4 flex flex-wrap gap-2">
				{mail.unread && <Badge>Unread</Badge>}
				{mail.important && <Badge variant="secondary">Important</Badge>}
			</div>

			<MetaGrid>
				<Meta label="From">
					{mail.from ? <Address address={mail.from} /> : "—"}
				</Meta>
				<Meta label="Date">
					<time
						dateTime={mail.date}
						title={fullDate.format(new Date(mail.date))}
					>
						{formatRelative(mail.date)}
					</time>
				</Meta>
				<Meta label="To">
					<AddressList addresses={mail.to} />
				</Meta>
				{mail.cc.length > 0 && (
					<Meta label="Cc">
						<AddressList addresses={mail.cc} />
					</Meta>
				)}
			</MetaGrid>

			{mail.attachments.length > 0 && (
				<ul className="mt-4 flex flex-wrap gap-2">
					{mail.attachments.map((file, index) => (
						<li
							// biome-ignore lint/suspicious/noArrayIndexKey: filenames can repeat
							key={`${file.filename}-${index}`}
							className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs"
							title={file.mimeType}
						>
							<Paperclip className="size-3.5 text-muted-foreground" />
							{file.filename}
							<span className="text-muted-foreground">
								{formatSize(file.size)}
							</span>
						</li>
					))}
				</ul>
			)}

			{mail.hasRemoteImages && !showImages && (
				<div className="mt-4 flex flex-wrap items-center gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
					<ImageOff className="size-3.5" />
					Images from the web are hidden so the sender can't tell you opened
					this.
					<Button
						size="sm"
						variant="outline"
						className="ml-auto h-7"
						onClick={() => setShowImages(true)}
					>
						Show images
					</Button>
				</div>
			)}

			<div className="mt-4 overflow-hidden rounded-lg border">
				{mail.html ? (
					<SafeHtmlFrame
						title={mail.subject}
						html={mail.html}
						appearance="paper"
						allowRemoteImages={showImages}
					/>
				) : (
					<p className="p-4 text-sm text-muted-foreground italic">
						This message has no readable body.
					</p>
				)}
			</div>
		</div>
	);
}

function Address({ address }: { address: EmailAddress }) {
	return (
		<span className="inline-flex max-w-full flex-wrap items-baseline gap-x-1.5">
			<PersonChip person={{ name: address.name }} />
			{address.name !== address.email && (
				<span className="truncate text-xs text-muted-foreground">
					{address.email}
				</span>
			)}
		</span>
	);
}

function AddressList({ addresses }: { addresses: EmailAddress[] }) {
	if (addresses.length === 0)
		return <span className="text-muted-foreground">—</span>;
	return (
		<span
			className="block truncate"
			title={addresses.map((a) => a.email).join(", ")}
		>
			{addresses.map((a) => a.name).join(", ")}
		</span>
	);
}

function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
