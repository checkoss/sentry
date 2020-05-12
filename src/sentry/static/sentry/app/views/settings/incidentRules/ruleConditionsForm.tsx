import React from 'react';
import styled from '@emotion/styled';

import {Client} from 'app/api';
import {Environment, Organization, SelectValue} from 'app/types';
import {Panel, PanelBody, PanelHeader} from 'app/components/panels';
import {addErrorMessage} from 'app/actionCreators/indicator';
import {defined} from 'app/utils';
import {getDisplayName} from 'app/utils/environment';
import {t, tct} from 'app/locale';
import Feature from 'app/components/acl/feature';
import FormField from 'app/views/settings/components/forms/formField';
import SearchBar from 'app/views/events/searchBar';
import SelectField from 'app/views/settings/components/forms/selectField';
import space from 'app/styles/space';
import theme from 'app/utils/theme';
import Tooltip from 'app/components/tooltip';
import {Column, AGGREGATIONS, FIELDS, TRACING_FIELDS} from 'app/utils/discover/fields';
import Field from 'app/views/settings/components/forms/field';
import {ColumnEditRow} from 'app/views/eventsV2/table/columnEditRow';
import {FieldValue, FieldValueKind} from 'app/views/eventsV2/table/types';

import {AlertRuleAggregations, TimeWindow, IncidentRule} from './types';
import getMetricDisplayName from './utils/getMetricDisplayName';

type TimeWindowMapType = {[key in TimeWindow]: string};

const TIME_WINDOW_MAP: TimeWindowMapType = {
  [TimeWindow.ONE_MINUTE]: t('1 minute'),
  [TimeWindow.FIVE_MINUTES]: t('5 minutes'),
  [TimeWindow.TEN_MINUTES]: t('10 minutes'),
  [TimeWindow.FIFTEEN_MINUTES]: t('15 minutes'),
  [TimeWindow.THIRTY_MINUTES]: t('30 minutes'),
  [TimeWindow.ONE_HOUR]: t('1 hour'),
  [TimeWindow.TWO_HOURS]: t('2 hours'),
  [TimeWindow.FOUR_HOURS]: t('4 hours'),
  [TimeWindow.ONE_DAY]: t('24 hours'),
};

type Props = {
  api: Client;
  organization: Organization;
  projectSlug: string;
  disabled: boolean;
  thresholdChart: React.ReactNode;
  onFilterUpdate: (query: string) => void;

  aggregate: Column;
  onAggregateUpdate: (index: number, column: Column) => void;
};

type State = {
  environments: Environment[] | null;
};

class RuleConditionsForm extends React.PureComponent<Props, State> {
  state: State = {
    environments: null,
  };

  componentDidMount() {
    this.fetchData();
  }

  generateFieldOptions() {
    const {organization} = this.props;

    let fields = Object.keys(FIELDS);
    let functions = Object.keys(AGGREGATIONS);

    // Strip tracing features if the org doesn't have access.
    if (!organization.features.includes('transaction-events')) {
      fields = fields.filter(item => !TRACING_FIELDS.includes(item));
      functions = functions.filter(item => !TRACING_FIELDS.includes(item));
    }
    const fieldOptions: Record<string, SelectValue<FieldValue>> = {};

    // Index items by prefixed keys as custom tags
    // can overlap both fields and function names.
    // Having a mapping makes finding the value objects easier
    // later as well.
    functions.forEach(func => {
      const ellipsis = AGGREGATIONS[func].parameters.length ? '\u2026' : '';
      fieldOptions[`function:${func}`] = {
        label: `${func}(${ellipsis})`,
        value: {
          kind: FieldValueKind.FUNCTION,
          meta: {
            name: func,
            parameters: AGGREGATIONS[func].parameters,
          },
        },
      };
    });

    fields.forEach(field => {
      fieldOptions[`field:${field}`] = {
        label: field,
        value: {
          kind: FieldValueKind.FIELD,
          meta: {
            name: field,
            dataType: FIELDS[field],
          },
        },
      };
    });

    return fieldOptions;
  }

  async fetchData() {
    const {api, organization, projectSlug} = this.props;

    try {
      const environments = await api.requestPromise(
        `/projects/${organization.slug}/${projectSlug}/environments/`,
        {
          query: {
            visibility: 'visible',
          },
        }
      );
      this.setState({environments});
    } catch (_err) {
      addErrorMessage(t('Unable to fetch environments'));
    }
  }

  render() {
    const {
      organization,
      disabled,
      onFilterUpdate,
      onAggregateUpdate,
      aggregate,
    } = this.props;
    const {environments} = this.state;

    const environmentList: [IncidentRule['environment'], React.ReactNode][] = defined(
      environments
    )
      ? environments.map((env: Environment) => [env.name, getDisplayName(env)])
      : [];

    const anyEnvironmentLabel = (
      <React.Fragment>
        {t('All Environments')}
        <div className="all-environment-note">
          {tct(
            `This will count events across every environment. For example,
             having 50 [code1:production] events and 50 [code2:development]
             events would trigger an alert with a critical threshold of 100.`,
            {code1: <code />, code2: <code />}
          )}
        </div>
      </React.Fragment>
    );
    environmentList.unshift([null, anyEnvironmentLabel]);

    const fieldOptions = this.generateFieldOptions();
    const gridColumns =
      aggregate.kind === 'function' && aggregate.function[2] !== undefined ? 3 : 2;
    return (
      <Panel>
        <PanelHeader>{t('Configure Rule Conditions')}</PanelHeader>
        <PanelBody>
          {this.props.thresholdChart}
          <FormField name="query" inline={false}>
            {({onChange, onBlur, onKeyDown, initialData}) => (
              <SearchBar
                defaultQuery={initialData?.query ?? ''}
                inlineLabel={
                  <Tooltip
                    title={t('Metric alerts are filtered to error events automatically')}
                  >
                    <SearchEventTypeNote>event.type:error</SearchEventTypeNote>
                  </Tooltip>
                }
                help={t('Choose which metric to trigger on')}
                disabled={disabled}
                useFormWrapper={false}
                organization={organization}
                onChange={onChange}
                onKeyDown={onKeyDown}
                onBlur={query => {
                  onFilterUpdate(query);
                  onBlur(query);
                }}
                onSearch={query => {
                  onFilterUpdate(query);
                  onChange(query, {});
                }}
              />
            )}
          </FormField>

          <Feature features={['performance-alerts']}>
            {({hasFeature}) =>
              hasFeature ? (
                <Field
                  label="Metric"
                  help={t('Choose an aggregate function and event property.')}
                  required
                >
                  <div>
                    <ColumnEditRow
                      fieldOptions={fieldOptions}
                      gridColumns={gridColumns}
                      column={aggregate}
                      onChange={onAggregateUpdate}
                      showFunctionsOnly
                    />
                  </div>
                </Field>
              ) : (
                <SelectField
                  name="aggregation"
                  label={t('Metric')}
                  help={t('Choose which metric to trigger on')}
                  choices={[
                    [
                      AlertRuleAggregations.UNIQUE_USERS,
                      getMetricDisplayName(AlertRuleAggregations.UNIQUE_USERS),
                    ],
                    [
                      AlertRuleAggregations.TOTAL,
                      getMetricDisplayName(AlertRuleAggregations.TOTAL),
                    ],
                  ]}
                  required
                  isDisabled={disabled}
                />
              )
            }
          </Feature>

          <SelectField
            name="timeWindow"
            label={t('Time Window')}
            help={
              <React.Fragment>
                <div>{t('The time window to use when evaluating the Metric')}</div>
                <div>
                  {t(
                    'Note: Triggers are evaluated every minute regardless of this value.'
                  )}
                </div>
              </React.Fragment>
            }
            choices={Object.entries(TIME_WINDOW_MAP)}
            required
            isDisabled={disabled}
            getValue={value => Number(value)}
            setValue={value => `${value}`}
          />
          <SelectField
            name="environment"
            label={t('Environment')}
            placeholder={t('All Environments')}
            help={t('Choose which environment events must match')}
            styles={{
              singleValue: (base: any) => ({
                ...base,
                '.all-environment-note': {display: 'none'},
              }),
              option: (base: any, state: any) => ({
                ...base,
                '.all-environment-note': {
                  ...(!state.isSelected && !state.isFocused ? {color: theme.gray3} : {}),
                  fontSize: theme.fontSizeSmall,
                },
              }),
            }}
            choices={environmentList}
            isDisabled={disabled || this.state.environments === null}
            isClearable
          />
        </PanelBody>
      </Panel>
    );
  }
}

const SearchEventTypeNote = styled('div')`
  font: ${p => p.theme.fontSizeExtraSmall} ${p => p.theme.text.familyMono};
  color: ${p => p.theme.gray3};
  background: ${p => p.theme.offWhiteLight};
  border-radius: ${p => p.theme.borderRadius};
  padding: ${space(0.5)} ${space(0.75)};
  margin: 0 ${space(0.5)} 0 ${space(1)};
  user-select: none;
`;

export default RuleConditionsForm;
