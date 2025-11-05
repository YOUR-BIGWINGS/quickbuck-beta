import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { useState } from "react";
import type { Id } from "convex/_generated/dataModel";
import { formatCurrency } from "~/lib/game-utils";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Building2, DollarSign, X } from "lucide-react";
import { useAuth } from "@clerk/react-router";

/**
 * CompanyOfferNotifications Component
 * Displays persistent notifications for company sale offers and counter-offers
 * These notifications will not disappear until the user accepts, rejects, or counter-offers
 */
export function CompanyOfferNotifications() {
  return <CompanyOfferNotificationsWrapper />;
}

function CompanyOfferNotificationsWrapper() {
  try {
    return <CompanyOfferNotificationsInner />;
  } catch {
    // If we're not in a context where useAuth is available (e.g., landing page),
    // don't render notifications
    return null;
  }
}

function CompanyOfferNotificationsInner() {
  const { userId: clerkUserId } = useAuth();

  // Get user and player
  const user = useQuery(
    api.users.findUserByToken,
    clerkUserId ? { tokenIdentifier: clerkUserId } : "skip"
  );
  const player = useQuery(
    api.players.getPlayerByUserId,
    user ? { userId: user._id as Id<"users"> } : "skip"
  );

  const pendingOffersAsSeller = useQuery(
    api.companySales.getPlayerPendingOffers,
    player ? { playerId: player._id } : "skip"
  );
  const pendingOffersAsBuyer = useQuery(
    api.companySales.getPlayerOffersAsBuyer,
    player ? { playerId: player._id } : "skip"
  );

  const respondToOffer = useMutation(
    api.companySales.respondToCompanySaleOffer
  );

  const [counterOfferPrices, setCounterOfferPrices] = useState<
    Record<string, string>
  >({});
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [error, setError] = useState<string>("");

  // Filter offers where I'm the seller and there's a pending offer or counter-offer
  const offersToRespondTo = pendingOffersAsSeller?.filter(
    (offer) =>
      (offer.status === "offer_pending" || offer.status === "counter_offer") &&
      offer.buyerId
  );

  // Filter offers where I'm the buyer and there's a counter-offer waiting for my response
  const counterOffersToRespondTo = pendingOffersAsBuyer?.filter(
    (offer) => offer.status === "counter_offer" && offer.counterOfferPrice
  );

  const handleAccept = async (offerId: Id<"companySales">) => {
    setError("");
    setRespondingTo(offerId);
    try {
      await respondToOffer({
        offerId,
        response: "accept",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept offer");
    } finally {
      setRespondingTo(null);
    }
  };

  const handleReject = async (offerId: Id<"companySales">) => {
    setError("");
    setRespondingTo(offerId);
    try {
      await respondToOffer({
        offerId,
        response: "reject",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject offer");
    } finally {
      setRespondingTo(null);
    }
  };

  const handleCounterOffer = async (offerId: Id<"companySales">) => {
    setError("");
    const priceStr = counterOfferPrices[offerId];
    if (!priceStr) {
      setError("Please enter a counter offer price");
      return;
    }

    const price = parseFloat(priceStr);
    if (isNaN(price) || price <= 0) {
      setError("Invalid price");
      return;
    }

    setRespondingTo(offerId);
    try {
      await respondToOffer({
        offerId,
        response: "counter",
        counterOfferPrice: Math.round(price * 100), // Convert to cents
      });
      // Clear the input
      setCounterOfferPrices((prev) => {
        const newPrices = { ...prev };
        delete newPrices[offerId];
        return newPrices;
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to make counter offer"
      );
    } finally {
      setRespondingTo(null);
    }
  };

  // Combine both types of offers to show
  const allNotifications = [
    ...(offersToRespondTo || []).map((offer) => ({
      ...offer,
      type: "seller" as const,
    })),
    ...(counterOffersToRespondTo || []).map((offer) => ({
      ...offer,
      type: "buyer" as const,
    })),
  ];

  if (!allNotifications || allNotifications.length === 0) {
    return null;
  }

  return (
    <div className="company-offer-notifications-container">
      {allNotifications.map((notification) => {
        const company = notification.company;
        if (!company) return null;

        const isSellerNotification = notification.type === "seller";
        const isBuyerNotification = notification.type === "buyer";
        const isCounterOffer = notification.status === "counter_offer";

        return (
          <div
            key={notification._id}
            className="company-offer-notification animate-slide-in"
          >
            <div className="notification-header">
              <Building2 className="notification-icon" />
              <div className="notification-title-section">
                <h3 className="notification-title">
                  {isSellerNotification && !isCounterOffer && "New Offer"}
                  {isSellerNotification &&
                    isCounterOffer &&
                    "Counter Offer Response"}
                  {isBuyerNotification && "Counter Offer Received"}
                </h3>
                <p className="notification-subtitle">{company.name}</p>
              </div>
            </div>

            <div className="notification-body">
              {isSellerNotification && !isCounterOffer && (
                <>
                  <p className="notification-text">
                    Someone wants to buy your company for:
                  </p>
                  <p className="notification-price">
                    {formatCurrency(notification.offeredPrice || 0)}
                  </p>
                  {notification.askingPrice > 0 && (
                    <p className="notification-asking">
                      Your asking price:{" "}
                      {formatCurrency(notification.askingPrice)}
                    </p>
                  )}
                </>
              )}

              {isSellerNotification && isCounterOffer && (
                <>
                  <p className="notification-text">
                    The buyer is considering your counter offer:
                  </p>
                  <p className="notification-price">
                    {formatCurrency(notification.counterOfferPrice || 0)}
                  </p>
                  <p className="notification-waiting">
                    Waiting for buyer's response...
                  </p>
                </>
              )}

              {isBuyerNotification && (
                <>
                  <p className="notification-text">
                    The seller has made a counter offer:
                  </p>
                  <p className="notification-price">
                    {formatCurrency(notification.counterOfferPrice || 0)}
                  </p>
                  <p className="notification-your-offer">
                    Your original offer:{" "}
                    {formatCurrency(notification.offeredPrice || 0)}
                  </p>
                </>
              )}
            </div>

            {isSellerNotification && !isCounterOffer && (
              <div className="notification-actions">
                <Button
                  size="sm"
                  onClick={() => handleAccept(notification._id)}
                  disabled={respondingTo === notification._id}
                  className="accept-button"
                >
                  <DollarSign className="h-4 w-4 mr-1" />
                  Accept
                </Button>

                <div className="counter-offer-section">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Counter offer"
                    value={counterOfferPrices[notification._id] || ""}
                    onChange={(e) =>
                      setCounterOfferPrices((prev) => ({
                        ...prev,
                        [notification._id]: e.target.value,
                      }))
                    }
                    className="counter-input"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleCounterOffer(notification._id)}
                    disabled={respondingTo === notification._id}
                  >
                    Counter
                  </Button>
                </div>

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleReject(notification._id)}
                  disabled={respondingTo === notification._id}
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
            )}

            {isBuyerNotification && (
              <div className="notification-actions">
                <Button
                  size="sm"
                  onClick={() => handleAccept(notification._id)}
                  disabled={respondingTo === notification._id}
                  className="accept-button"
                >
                  <DollarSign className="h-4 w-4 mr-1" />
                  Accept Counter
                </Button>

                <div className="counter-offer-section">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="New counter offer"
                    value={counterOfferPrices[notification._id] || ""}
                    onChange={(e) =>
                      setCounterOfferPrices((prev) => ({
                        ...prev,
                        [notification._id]: e.target.value,
                      }))
                    }
                    className="counter-input"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleCounterOffer(notification._id)}
                    disabled={respondingTo === notification._id}
                  >
                    Counter Again
                  </Button>
                </div>

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleReject(notification._id)}
                  disabled={respondingTo === notification._id}
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
            )}

            {error && <div className="notification-error">{error}</div>}
          </div>
        );
      })}

      <style>{`
        .company-offer-notifications-container {
          position: fixed;
          top: 80px;
          right: 20px;
          z-index: 8000;
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-width: 420px;
          width: calc(100% - 40px);
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .animate-slide-in {
          animation: slideIn 0.3s ease-out;
        }

        .company-offer-notification {
          background: white;
          border: 2px solid #3b82f6;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .notification-header {
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 12px;
        }

        .notification-icon {
          width: 28px;
          height: 28px;
          color: #3b82f6;
          flex-shrink: 0;
        }

        .notification-title-section {
          flex: 1;
        }

        .notification-title {
          font-size: 16px;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
          line-height: 1.2;
        }

        .notification-subtitle {
          font-size: 14px;
          color: #6b7280;
          margin: 2px 0 0 0;
        }

        .notification-body {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .notification-text {
          font-size: 14px;
          color: #4b5563;
          margin: 0;
        }

        .notification-price {
          font-size: 24px;
          font-weight: 700;
          color: #10b981;
          margin: 4px 0;
        }

        .notification-asking,
        .notification-your-offer {
          font-size: 13px;
          color: #6b7280;
          margin: 0;
        }

        .notification-waiting {
          font-size: 13px;
          color: #f59e0b;
          font-style: italic;
          margin: 0;
        }

        .notification-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding-top: 8px;
          border-top: 1px solid #e5e7eb;
        }

        .accept-button {
          background: #10b981;
          border-color: #059669;
        }

        .accept-button:hover {
          background: #059669;
        }

        .counter-offer-section {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .counter-input {
          flex: 1;
          height: 36px;
          font-size: 14px;
        }

        .notification-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 13px;
        }

        @media (max-width: 768px) {
          .company-offer-notifications-container {
            top: 60px;
            right: 10px;
            left: 10px;
            max-width: none;
            width: calc(100% - 20px);
          }

          .notification-title {
            font-size: 14px;
          }

          .notification-price {
            font-size: 20px;
          }

          .counter-offer-section {
            flex-direction: column;
          }

          .counter-input {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
