import {
  ArrowLeftRight,
  BookOpen,
  Download,
  FolderOpen,
  Globe,
  HardDrive,
  Maximize,
  Moon,
  ShieldCheck,
  Send,
  Shrink,
  Sun,
  SunDim,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFilePicker } from '../../hooks/useFilePicker';
import { useReadingOptions } from '../../hooks/useReadingOptions';
import { formatBytes } from '../../i18n/formatBytes';
import { PAGE_QUALITIES } from '../../modules/archive/domain/PageQuality';
import {
  DELETE_ORIGINALS,
  MAX_BRIGHTNESS,
  MIN_BRIGHTNESS,
} from '../../modules/settings/domain/Settings';
import { hasDeviceFiles } from '../../shared/infrastructure/deviceFiles';
import { useDeviceFilesStore } from '../../stores/deviceFilesStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useTransferStore } from '../../stores/transferStore';
import { ExportSheet } from '../library/ExportSheet';
import { SyncSettingsSection } from '../sync/SyncSettingsSection';
import { OptimizeSheet } from '../library/OptimizeSheet';
import { GroupedSection, LinkRow, MenuRow, Row } from '../ui/GroupedList';
import { LargeTitleScreen } from '../ui/LargeTitleScreen';
import styles from './Settings.module.css';

const APP_VERSION = '0.8.0';

export function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const settings = useSettingsStore((state) => state.settings);
  const update = useSettingsStore((state) => state.update);
  const values = settings.toPrimitive();
  const options = useReadingOptions();
  const items = useLibraryStore((state) => state.items);
  const [optimizing, setOptimizing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const android = hasDeviceFiles();
  const folder = settings.getComicsFolder();
  const deleteOptions = DELETE_ORIGINALS.map((value) => ({
    value,
    label: t(`folder.deleteModes.${value}`),
  }));
  // Web version: pick the exported file in the browser.
  const { openPicker: pickExportFile, pickerInput: exportPickerInput } = useFilePicker((files) => {
    if (files[0]) void useTransferStore.getState().importExport(files[0]);
  });
  const importOptimizationOptions = [
    { value: 'off' as const, label: t('optimize.importOff') },
    ...PAGE_QUALITIES.map((value) => ({
      value,
      label: t(`optimize.qualities.${value}.label`),
    })),
  ];

  useEffect(() => {
    void useLibraryStore.getState().load();
  }, []);

  return (
    <LargeTitleScreen title={t('settings.title')}>
      <GroupedSection title={t('settings.readingDefaults')} footer={t('settings.readingFooter')}>
        <MenuRow
          icon={BookOpen}
          iconColor="#5856d6"
          label={t('reader.modeLabel')}
          value={values.readingMode}
          options={options.modes}
          onChange={(readingMode) => void update({ readingMode })}
        />
        <MenuRow
          icon={ArrowLeftRight}
          iconColor="#ff9500"
          label={t('reader.directionLabel')}
          value={values.readingDirection}
          options={options.directions}
          onChange={(readingDirection) => void update({ readingDirection })}
        />
        <MenuRow
          icon={Maximize}
          iconColor="#34c759"
          label={t('reader.fitLabel')}
          value={values.fitMode}
          options={options.fits}
          onChange={(fitMode) => void update({ fitMode })}
        />
      </GroupedSection>

      <GroupedSection title={t('reader.brightness')} footer={t('settings.brightnessFooter')}>
        <div className={styles.sliderRow}>
          <SunDim size={18} aria-hidden className={styles.sliderIcon} />
          <input
            type="range"
            min={MIN_BRIGHTNESS}
            max={MAX_BRIGHTNESS}
            step={0.05}
            value={values.brightness}
            aria-label={t('reader.brightness')}
            aria-valuetext={`${Math.round(values.brightness * 100)}%`}
            onChange={(event) => void update({ brightness: Number(event.target.value) })}
          />
          <Sun size={22} aria-hidden className={styles.sliderIcon} />
        </div>
      </GroupedSection>

      <GroupedSection title={t('settings.appearance')}>
        <MenuRow
          icon={Moon}
          iconColor="#5e5ce6"
          label={t('settings.theme')}
          value={values.theme}
          options={options.themes}
          onChange={(theme) => void update({ theme })}
        />
        <MenuRow
          icon={Globe}
          iconColor="#007aff"
          label={t('settings.language')}
          value={values.language}
          options={options.languages}
          onChange={(language) => void update({ language })}
        />
      </GroupedSection>

      <GroupedSection title={t('optimize.storage')} footer={t('optimize.storageFooter')}>
        <Row icon={HardDrive} iconColor="#8e8e93" label={t('optimize.librarySize')}>
          {formatBytes(items.getStoredSize(), i18n.language)}
        </Row>
        <MenuRow
          icon={Shrink}
          iconColor="#c2185b"
          label={t('optimize.onImport')}
          value={values.importOptimization}
          options={importOptimizationOptions}
          onChange={(importOptimization) => void update({ importOptimization })}
        />
        {!items.isEmpty() && (
          <LinkRow label={t('optimize.reduceAll')} onClick={() => setOptimizing(true)} />
        )}
      </GroupedSection>
      {optimizing && (
        <OptimizeSheet
          comicIds={items.toArray().map((item) => item.getComic().getId())}
          onClose={() => setOptimizing(false)}
        />
      )}

      {android && (
        <GroupedSection title={t('folder.title')} footer={t('folder.footer')}>
          <LinkRow
            icon={FolderOpen}
            iconColor="#007aff"
            label={t('folder.folder')}
            detail={folder?.name ?? t('folder.choose')}
            onClick={() => void useDeviceFilesStore.getState().chooseFolder()}
          />
          <MenuRow
            icon={Trash2}
            iconColor="#ff3b30"
            label={t('folder.deleteOriginals')}
            value={values.deleteOriginals}
            options={deleteOptions}
            onChange={(deleteOriginals) => void update({ deleteOriginals })}
          />
        </GroupedSection>
      )}

      <SyncSettingsSection />

      <GroupedSection title={t('transfer.title')} footer={t('transfer.footer')}>
        {android && !items.isEmpty() && (
          <LinkRow
            icon={Send}
            iconColor="#34c759"
            label={t('transfer.export')}
            onClick={() => setExporting(true)}
          />
        )}
        <LinkRow
          icon={Download}
          iconColor="#5856d6"
          label={t('transfer.import')}
          onClick={
            android ? () => void useDeviceFilesStore.getState().pickAndImport() : pickExportFile
          }
        />
      </GroupedSection>
      {exportPickerInput}
      {exporting && (
        <ExportSheet title={t('transfer.export')} onClose={() => setExporting(false)} />
      )}

      <GroupedSection title={t('settings.privacy')} footer={t('settings.privacyText')}>
        <Row icon={ShieldCheck} iconColor="#34c759" label={t('settings.offline')}>
          {t('settings.offlineValue')}
        </Row>
      </GroupedSection>

      <GroupedSection title={t('settings.about')}>
        <Row label={t('app.name')}>{APP_VERSION}</Row>
      </GroupedSection>
    </LargeTitleScreen>
  );
}
