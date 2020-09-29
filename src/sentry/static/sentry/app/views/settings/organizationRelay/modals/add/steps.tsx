import React from 'react';
import styled from '@emotion/styled';

type Props = {
  children: Array<React.ReactElement>;
};

const Steps = ({children}: Props) => (
  <React.Fragment>
    {React.Children.map(children, (child, index) => (
      <React.Fragment>
        <Bullet>{index + 1}</Bullet>
        {child}
      </React.Fragment>
    ))}
  </React.Fragment>
);

export default Steps;

const Bullet = styled('div')`
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: ${p => p.theme.yellow400};
  font-size: ${p => p.theme.fontSizeSmall};
`;
