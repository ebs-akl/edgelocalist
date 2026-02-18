import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, MessageSquare, Map, ExternalLink } from "lucide-react";
import { formatPhoneDisplay, formatCurrency } from "@/lib/contacts";
import type { NearbyContact } from "@/lib/contacts";

interface Props {
  contact: NearbyContact;
  repName: string;
  isGhlMode: boolean;
  onClose: () => void;
}

export default function ContactDetailModal({ contact, repName, isGhlMode, onClose }: Props) {
  const smsBody = encodeURIComponent(
    `Hi ${contact.first_name}, this is ${repName} from Cutco — I'm in your area and wanted to reach out!`
  );
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${contact.address}, ${contact.city}, ${contact.state} ${contact.zip}`
  )}`;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Oswald', sans-serif" }}>
            {contact.first_name} {contact.last_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Address */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-1">
            <p className="text-sm font-medium">{contact.address}</p>
            <p className="text-sm text-muted-foreground">
              {contact.city}, {contact.state} {contact.zip}
            </p>
          </div>

          {/* Primary stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-xs text-muted-foreground mb-0.5">Distance</p>
              <p className="font-bold text-sm font-mono">{contact.distance_miles.toFixed(1)} mi</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-xs text-muted-foreground mb-0.5">Lifetime $</p>
              <p className="font-bold text-sm">{formatCurrency(contact.lifetime_value)}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-xs text-muted-foreground mb-0.5">Last Order</p>
              <p className="font-bold text-xs">
                {contact.last_order_date
                  ? new Date(contact.last_order_date).toLocaleDateString()
                  : "—"}
              </p>
            </div>
          </div>

          {/* Cutco metrics */}
          <div className="rounded-lg border p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cutco Metrics</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Orders</span>
                <span className="font-medium">{contact.order_count ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gifts</span>
                <span className="font-medium">{contact.gift_count ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">RLT</span>
                <span className="font-medium">{contact.rlt || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">BIZ</span>
                <span className="font-medium">{contact.biz || "—"}</span>
              </div>
              <div className="flex justify-between col-span-2">
                <span className="text-muted-foreground">CAT</span>
                <span className="font-medium">{contact.cat || "—"}</span>
              </div>
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <span className="text-sm font-mono">{formatPhoneDisplay(contact.phone)}</span>
            <Badge variant="secondary" className="text-xs">Primary</Badge>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3">
            <a href={`tel:${contact.phone}`} target="_blank" rel="noopener noreferrer">
              <Button className="w-full min-h-[48px]" variant="default">
                <Phone className="mr-2 h-4 w-4" />
                Call
              </Button>
            </a>
            <a href={`sms:${contact.phone}?body=${smsBody}`} target="_blank" rel="noopener noreferrer">
              <Button className="w-full min-h-[48px]" variant="outline">
                <MessageSquare className="mr-2 h-4 w-4" />
                SMS
              </Button>
            </a>
          </div>

          <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
            <Button className="w-full min-h-[48px]" variant="outline">
              <Map className="mr-2 h-4 w-4" />
              Get Directions
            </Button>
          </a>

          {isGhlMode && (
            <Button className="w-full min-h-[48px]" variant="outline">
              <ExternalLink className="mr-2 h-4 w-4" />
              View in GHL
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
