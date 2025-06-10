"use client";

import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/amplitude";

interface RatingWidgetProps {
  className?: string;
}

const FEEDBACK_FORM_URL = import.meta.env.VITE_FEEDBACK_FORM_URL || "http://localhost:8000/uninstall";
const CHROME_STORE_URL = import.meta.env.VITE_CHROME_STORE_URL || "http://localhost:8000/chrome";

export function RatingWidget({ className }: RatingWidgetProps) {
  const handleRatingClick = (rating: number) => {
    trackEvent('rating_set', {
      rating,
      destination: rating <= 3 ? 'feedback_form' : 'chrome_store'
    });
  };

  return (
    <div className={cn("w-full", className)}>
      <hr className="border-0 border-t border-border/25 my-4" />
      <p className="text-center text-sm text-muted-foreground mb-2">
        Rate us:
      </p>
      <div className="flex justify-center">
        <div className="inline-flex">
          <input
            name="rating"
            value="5"
            type="radio"
            disabled
            checked
            className="absolute -left-[9999px]"
          />
          {[1, 2, 3, 4, 5].map((rating) => (
            <div key={rating}>
              <input
                name="rating"
                id={`rating-${rating}`}
                value={rating}
                type="radio"
                className="absolute -left-[9999px]"
              />
              <label
                htmlFor={`rating-${rating}`}
                className="cursor-pointer"
              >
                <a
                  href={rating <= 3 ? FEEDBACK_FORM_URL : CHROME_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleRatingClick(rating)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 576 512"
                    className="h-6 w-6 mx-0.5 fill-primary/60 transition-colors hover:fill-primary peer-checked:fill-primary"
                  >
                    <path d="M259.3 17.8L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0z" />
                  </svg>
                </a>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 