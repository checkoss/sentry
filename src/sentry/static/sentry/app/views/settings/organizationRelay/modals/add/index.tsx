import React from 'react';
import styled from '@emotion/styled';

import {t, tct} from 'app/locale';
import ExternalLink from 'app/components/links/externalLink';

import ModalManager from '../modalManager';
import Steps from './steps';
import Step from './step';

class Add extends ModalManager {
  getTitle() {
    return t('Register Key');
  }

  getBtnSaveLabel() {
    return t('Register');
  }

  getData() {
    const {savedRelays} = this.props;
    const trustedRelays = [...savedRelays, this.state.values];

    return {trustedRelays};
  }

  getContent() {
    return (
      <Steps>
        <Step
          title={tct('Initialize the configuration. [link: Learn how]', {
            link: (
              <ExternalLink href="https://docs.sentry.io/product/relay/getting-started/#initializing-configuration" />
            ),
          })}
        >
          {'okokok'}
        </Step>
        <Step
          title={tct(
            'Go to the file [jsonFile: credentials.json] to find the public key and enter it below.',
            {
              jsonFile: (
                <CredentialsLink href="https://docs.sentry.io/product/relay/getting-started/#registering-relay-with-sentry" />
              ),
            }
          )}
        >
          {this.getForm()}
        </Step>
      </Steps>
    );
  }
}

export default Add;

const CredentialsLink = styled(ExternalLink)`
  color: ${p => p.theme.pink400};
  :hover {
    color: ${p => p.theme.pink400};
  }
`;
