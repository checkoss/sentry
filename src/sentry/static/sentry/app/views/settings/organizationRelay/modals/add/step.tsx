import React from 'react';

type Props = {
  title: React.ReactNode;
  children: React.ReactNode;
};

const Step = ({title, children}: Props) => (
  <div>
    <div>{title}</div>
    <div>{children}</div>
  </div>
);

export default Step;
