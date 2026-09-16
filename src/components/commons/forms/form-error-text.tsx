type FormErrorTextProps = {
  message?: string;
  id?: string;
};

export const FormErrorText = ({ message, id }: FormErrorTextProps) => {
  if (!message) return null;

  return (
    <p id={id} role="alert" className="text-sm text-red-600">
      {message}
    </p>
  );
};
