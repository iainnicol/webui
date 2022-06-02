import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatButtonHarness } from '@angular/material/button/testing';
import { createComponentFactory, mockProvider, Spectator } from '@ngneat/spectator/jest';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { MockPipe } from 'ng-mocks';
import { FormatDateTimePipe } from 'app/core/pipes/format-datetime.pipe';
import { JobState } from 'app/enums/job-state.enum';
import { Job } from 'app/interfaces/job.interface';
import { EntityModule } from 'app/modules/entity/entity.module';
import { IxTableModule } from 'app/modules/ix-tables/ix-table.module';
import { IxTableHarness } from 'app/modules/ix-tables/testing/ix-table.harness';
import { jobsInitialState, JobsState } from 'app/modules/jobs/store/job.reducer';
import { selectJobs, selectJobState } from 'app/modules/jobs/store/job.selectors';
import { JobLogsRowComponent } from 'app/pages/jobs/job-logs-row/job-logs-row.component';
import { DialogService, WebSocketService } from 'app/services';
import { CoreService } from 'app/services/core-service/core.service';
import { JobsListComponent } from './jobs-list.component';

export const fakeJobDataSource: Job[] = [{
  abortable: true,
  arguments: [1],
  description: null,
  id: 446,
  logs_path: '/var/log/jobs/446.log',
  method: 'cloudsync.sync',
  progress: {
    description: 'Starting',
    extra: null,
    percent: 0,
  },
  result: null,
  state: JobState.Failed,
  time_finished: { $date: 1653721201697 },
  time_started: { $date: 1653721201446 },
}, {
  abortable: true,
  arguments: [2],
  description: null,
  id: 445,
  logs_path: '/var/log/jobs/445.log',
  method: 'cloudsync.sync',
  progress: {
    description: 'Starting',
    extra: null,
    percent: 100,
  },
  result: null,
  state: JobState.Success,
  time_finished: { $date: 1653721201899 },
  time_started: { $date: 1653721201440 },
}] as Job[];

describe('JobsListComponent', () => {
  let spectator: Spectator<JobsListComponent>;
  let loader: HarnessLoader;
  let store$: MockStore<JobsState>;

  const createComponent = createComponentFactory({
    component: JobsListComponent,
    imports: [
      EntityModule,
      IxTableModule,
    ],
    declarations: [
      JobLogsRowComponent,
      MockPipe(FormatDateTimePipe, jest.fn(() => '2022-05-28 00:00:01')),
    ],
    providers: [
      mockProvider(CoreService),
      mockProvider(WebSocketService),
      mockProvider(DialogService),
      provideMockStore({
        selectors: [
          {
            selector: selectJobState,
            value: jobsInitialState,
          },
          {
            selector: selectJobs,
            value: [],
          },
        ],
      }),
    ],
  });

  beforeEach(() => {
    spectator = createComponent();
    loader = TestbedHarnessEnvironment.loader(spectator.fixture);
    store$ = spectator.inject(MockStore);
  });

  it('should show table rows', async () => {
    store$.overrideSelector(selectJobs, fakeJobDataSource);
    store$.refreshState();

    const table = await loader.getHarness(IxTableHarness);
    const cells = await table.getCells(true);
    const expectedRows = [
      ['Name', 'State', 'ID', 'Started', 'Finished', 'Arguments/Logs'],
      ['highlight_offcloudsync.sync', 'FAILED', '446', '2022-05-28 00:00:01', '2022-05-28 00:00:01', 'View'],
      ['check_circle_outlinecloudsync.sync', 'SUCCESS', '445', '2022-05-28 00:00:01', '2022-05-28 00:00:01', 'View'],
    ];

    expect(cells).toEqual(expectedRows);
  });

  it('should have empty message when loaded and datasource is empty', async () => {
    store$.overrideSelector(selectJobs, []);
    store$.refreshState();

    const table = await loader.getHarness(IxTableHarness);
    const text = await table.getCellTextByIndex();

    expect(text).toEqual([['No tasks']]);
  });

  it('should expand only one row on click', async () => {
    store$.overrideSelector(selectJobs, fakeJobDataSource);
    store$.refreshState();

    const [firstExpandButton, secondExpandButton] = await loader.getAllHarnesses(MatButtonHarness.with({ text: 'View' }));
    await firstExpandButton.click();
    await secondExpandButton.click();

    expect(spectator.queryAll('.expanded').length).toEqual(1);
  });
});