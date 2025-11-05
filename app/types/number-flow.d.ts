declare namespace JSX {
  interface IntrinsicElements {
    'number-flow': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        value?: number;
        format?: Intl.NumberFormatOptions;
        locales?: string | string[];
        trend?: number;
        ref?: React.Ref<any>;
        suppressHydrationWarning?: boolean;
        prefix?: string;
        suffix?: string;
        numberPrefix?: string;
        numberSuffix?: string;
      },
      HTMLElement
    >;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'number-flow': HTMLElement & {
      value: number;
      format: Intl.NumberFormatOptions;
      locales: string | string[];
      trend: number;
      prefix?: string;
      suffix?: string;
      numberPrefix?: string;
      numberSuffix?: string;
      update(value: number): void;
    };
  }
}

export {};
