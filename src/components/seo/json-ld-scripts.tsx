type Props = {
  values: unknown[];
};

export const JsonLdScripts = ({ values }: Props) => (
  <>
    {values.map((value, index) => (
      <script
        key={index}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(value).replace(/</g, "\\u003c"),
        }}
      />
    ))}
  </>
);
