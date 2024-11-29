import {
  Options,
  OptionsColumns,
  OptionsData,
  OptionsPagination,
  // OptionsGeneral,
  // OptionsLocale,
  ColumnDefinition,
  RowComponent,
  CellComponent,
} from 'tabulator-tables';
import axios from 'axios';
import { assign, isArray, isObject, isString, map } from 'lodash';

// import zhCNLang from 'langs/zh-cn.json';
import type { ReactTabulatorProps, TableMode } from './interface';
import { Message } from '@arco-design/web-react';
import { PlatformAppMode, TableTypeFlag } from 'src/interface';
import { convertExpressionByRule, simpleExecExpression } from './utils';
import { CUSTOM_EDITOR_MAP, checkIsCustomEditor } from './editors';
import { ROW_HEIGHT } from './constants';
import _ from 'lodash';

export const genInitOptions = (
  tabulatorProps: ReactTabulatorProps
): Options => {
  const {
    layout = 'fitColumns',
    data: tableData,
    actionId,
    columns: columnDefs,
    enableRemote = false,
    tableMode = 'editable',
    appMode,
    uniformProps,
    indexField
  } = tabulatorProps;
  let { commonOptions = {} } = uniformProps || {};
  const { headerVisible = true, enableColumnGroup = false } =
    uniformProps || {};

  if (!isObject(commonOptions)) {
    commonOptions = {};
  }

  const {
    hidePagination = false,
    rowGroupFieldList = [],
    rowGroupHeaderFieldList = [],
    tableLayout,
    tableIndex,
    selectable = 'highlight',
    ...availableCommonOptions
  } = commonOptions;
  const selectableRows = _.isNumber(_.toNumber(selectable))
    ? _.toNumber(selectable)
    : selectable;

  const {
    enableIndexedDBQuery = false,
    quickAddConfigs,
    indexdbConfigs,
    tableTypeFlag,
    remoteAjax,
  } = uniformProps || {};
  const generalOptions = genGeneralOptions(tableMode, selectableRows);

  const formatColumnDefs =
    tableTypeFlag === TableTypeFlag.customTableSelect
      ? quickAddConfigs.columns
      : columnDefs;
  const formatTableData =
    tableTypeFlag === TableTypeFlag.customTableSelect
      ? quickAddConfigs.data
      : tableData;

  const columnDefsOptions = genColumnDefsOptions(
    formatColumnDefs,
    appMode,
    enableColumnGroup
  );
  const ajaxOptions = genAjaxOptions({
    actionId,
    enableRemote,
    enableIndexedDBQuery,
    params: remoteAjax?.params,
  });
  const staticDataOptions = genStaticDataOptions({
    tableData: formatTableData,
    columnDefs,
    tableMode,
    enableIndexedDBQuery,
  });

  const rowGroupOptions = genRowGropOptions(
    rowGroupFieldList,
    rowGroupHeaderFieldList
  );

  const paginationOptions = genPaginationOptions({
    enableRemote,
    tableMode,
    hidePagination,
  });
  const indexedDBOptions = genIndexedDBOptions(
    enableIndexedDBQuery,
    indexdbConfigs,
    tableTypeFlag
  );
  const defaultLayout =
    tableTypeFlag === TableTypeFlag.customTableSelect
      ? 'fitDataStretch'
      : layout;
  const formatLayout = tableLayout ? tableLayout : defaultLayout;
  const indexOptions = tableIndex ? { index: tableIndex } : {};

  return {
    columnDefaults: {
      // sorter: false,
      headerSort: false,
      resizable: false,
      headerFilter: false,
      editableTitle: false,
    },
    keybindings: {
      // "redo" : "ctrl + 82", //bind redo function to ctrl + r
      // navNext: 'enter',
    },
    ...generalOptions,
    ...columnDefsOptions,
    ...indexedDBOptions,
    ...ajaxOptions,
    ...staticDataOptions,
    ...paginationOptions,
    ...rowGroupOptions,
    ...indexOptions,
    headerVisible,
    layout: formatLayout, // fit columns to width of table (optional)
    // ...options // props.options are passed to Tabulator's options.
    ...availableCommonOptions,
    showInput: tableMode === 'editable' ? true : false,
    index:indexField
  } as Options;
};

const genGeneralOptions = (
  tableMode: TableMode,
  selectableRows: boolean | number | 'highlight'
): Options & {
  selectableRows?: boolean | number | 'highlight';
  selectableRowsRollingSelection?: boolean;
  selectableRowsCheck?: (row: RowComponent) => void;
} => {
  return {
    height: '100%',
    maxHeight: '100%',
    reactiveData: true,
    tabEndNewRow: true, // create empty new row on tab
    locale: 'zh',
    selectableRows: selectableRows || 'highlight', // false, true, integer, highlight(default)
    // selectableRollingSelection: false, // disable rolling selection
    selectableRowsRollingSelection: false, //disable rolling selection
    renderHorizontal: 'virtual',
    renderVertical: 'virtual',
    dataTree: true,
    dataTreeStartExpanded: true,
    // langs: {
    //   zh: zhCNLang,
    // },
    // <div style='display:inline-block; border-radius:10px; background:#fff; font-weight:bold; font-size:16px; color:#000; padding:10px 20px;'>
    //   数据加载中...
    // </div>
    dataLoaderLoading: `
      <div class="arco-spin"><span class="arco-spin-icon"><div class="arco-spin-dot-list"><div class="arco-spin-dot"></div><div class="arco-spin-dot"></div><div class="arco-spin-dot"></div><div class="arco-spin-dot"></div><div class="arco-spin-dot"></div></div></span></div>
    `,
    dataLoaderError: '',
    dataLoaderErrorTimeout: 0,
    rowHeight: ROW_HEIGHT,
    placeholder: tableMode === 'editable' ? '' : '暂无数据',
    // frozenRows: 1,
    // frozenRows: function (row) {
    //   const frozenFlag = row.getElement().dataset['frozen'];
    //   console.log(frozenFlag);
    //   return frozenFlag === 'true'; // freeze all rows with a name less than 10 characters long
    // },
    // footerElement: '<button>Custom Button</button>',
    // adverts: true,
    // advertSrc: 'https://fujia.site/articles/632ef6cf86ce2500350b37a1'
  };
};

function editCheck(editorParams: Record<string, any>) {
  return (cell: CellComponent) => {
    //cell - the cell component for the editable cell
    const { disabledRule = '' } = editorParams || {};
    //get row data
    const data = cell.getRow().getData();

    const execExpr = convertExpressionByRule(disabledRule, { ...data });
    console.log('execExpr', execExpr);

    if (!execExpr || execExpr.includes('undefined')) return true;

    try {
      const disableEditable = simpleExecExpression(execExpr)();
      // console.log('disableEditable', !disableEditable);

      if (disableEditable) {
        cell.getElement().classList.add('cell-edit-disable');
        // cell.getElement().replaceChildren();
      }

      if (
        !disableEditable &&
        cell.getElement().classList.contains('cell-edit-disable')
      ) {
        cell.getElement().classList.remove('cell-edit-disable');
      }

      return !disableEditable;
    } catch (e) {
      console.error(`executing '${execExpr}' failed: `, e?.message);
      return true;
    }
  };
}

export function customEditorAndFormatterPipe(
  tempColDefs: ColumnDefinition[],
  _appMode?: PlatformAppMode,
  enableColumnGroup = false
): ColumnDefinition[] {
  function handleNormalColDef(colDef: ColumnDefinition) {
    const {
      editableTitle = false,
      editable = false,
      editor,
      formatter,
      editorParams = {},
      ...rest
    } = colDef;

    // const formatEditableTitle = appMode !== 'EDIT' ? false : editableTitle;

    const isCustomEditor =
      isString(editor) && checkIsCustomEditor(editor as any);

    const customColDefs: Record<string, any> = {
      editableTitle,
    };

    if (isCustomEditor) {
      customColDefs.editor = CUSTOM_EDITOR_MAP[editor];
    } else if (editor) {
      customColDefs.editor = editor;
    }

    if (editable) {
      customColDefs.editable = editCheck(editorParams);
    }

    /**
     * handle formatter
     */
    if (formatter === 'rowSelection') {
      customColDefs.cellClick = function (_e, cell: CellComponent) {
        cell.getRow().toggleSelect();
      };
    }

    return {
      formatter,
      editorParams,
      ...rest,
      ...customColDefs,
    };
  }

  if (enableColumnGroup) {
    return map(tempColDefs, (item) => {
      const { columns, ...restGroupColDefs } = item;

      if (!isArray(columns)) {
        return handleNormalColDef(restGroupColDefs);
      }
      // only thinking have two level column group
      return {
        ...restGroupColDefs,
        columns: map(columns, handleNormalColDef),
      };
    });
  }

  return map(tempColDefs, handleNormalColDef);
}

const genColumnDefsOptions = (
  initColDefs: ColumnDefinition[],
  appMode?: PlatformAppMode,
  enableColumnGroup = false
): OptionsColumns => {
  if (isArray(initColDefs) && initColDefs.length > 0) {
    return {
      columns: customEditorAndFormatterPipe(
        initColDefs,
        appMode,
        enableColumnGroup
      ),
    };
  }

  return {
    autoColumns: true,
    autoColumnsDefinitions: function (definitions) {
      //definitions - array of column definition objects
      if (appMode !== 'EDIT') return definitions;

      definitions.forEach((column) => {
        column.editableTitle = true;
      });

      return definitions;
    },
  };
};

function queryRealm(actionId, formatParams) {
  return (url, config, params) => {
    //url - the url of the request
    //config - the ajaxConfig object
    //params - the ajaxParams object
    console.log(url, config, params);
    return new Promise((resolve, reject) => {
      const executeActionRequest = {
        actionId,
        viewMode: false,
        enablePage: true,
        size: 10,
        page: 1,
        where: {
          ...formatParams,
        },
        dateBetween: {},
      };
      const formData = new FormData();

      formData.append(
        'executeActionDTO',
        JSON.stringify(assign(executeActionRequest))
      );
      //return promise
      const remoteUrl = '/api/v1/actions/execute';
      return axios
        .post(remoteUrl, formData, {})
        .then((res) => {
          resolve(res);
        })
        .catch((err) => {
          reject(err);
        });
    });
  };
}

export const genAjaxOptions = ({
  actionId,
  enableRemote,
  enableIndexedDBQuery,
  params,
}: {
  actionId: string;
  enableRemote: boolean;
  enableIndexedDBQuery: boolean;
  params?: Record<string, any>;
}): OptionsData => {
  if (!actionId || !enableRemote || enableIndexedDBQuery) return {};

  const formatParams = isObject(params) ? params : {};
  console.log(formatParams, 'formatParams');
  return {
    ajaxURL: '/api/v1/actions/execute',
    //   // ajaxURL: 'https://staging.fusiontech.cn/api/v1/actions/execute',
    ajaxRequestFunc: queryRealm(actionId, formatParams),
    ajaxResponse: function (_url, _params, response) {
      //url - the URL of the request
      //params - the parameters passed with the request
      //response - the JSON object returned in the body of the response.
      const { data, responseMeta, size, total } = response;
      const { status, success } = responseMeta || {};

      if (status !== 200 && !success) {
        Message.error('数据加载异常，请稍后重试！');
      }
      // return response.data.tags;
      const { body = [] } = data || {};
      const lastPage = Math.max(Math.ceil(Number(total) / Number(size)), 1);
      console.log(
        'ajaxResponse',
        response,
        'lastPage: ',
        lastPage,
        typeof total,
        typeof size
      );
      return {
        data: body,
        last_page: lastPage,
      }; //return the tableData property of a response json object
    },
  };
};

const genStaticDataOptions = ({
  tableData,
  enableIndexedDBQuery,
}: {
  tableData: Record<string, unknown>[];
  enableIndexedDBQuery: boolean;
  columnDefs?: ColumnDefinition[];
  tableMode?: TableMode;
}): OptionsData => {
  if (!isArray(tableData) || enableIndexedDBQuery) {
    return {};
  }

  return {
    data: tableData,
  };
};

export interface GenPaginationOptionsParams {
  enableRemote: boolean;
  tableMode: TableMode;
  hidePagination: boolean;
}
const genPaginationOptions = ({
  tableMode,
  enableRemote,
  hidePagination,
}: GenPaginationOptionsParams): OptionsPagination => {
  if (tableMode === 'editable' || hidePagination) {
    return {
      pagination: false,
    };
  }
  return {
    pagination: true,
    paginationSize: 10,
    paginationSizeSelector: [10, 30, 50, 100, 500, 1000],
    paginationMode: enableRemote ? 'remote' : 'local',
  };
};

const genRowGropOptions = (
  rowGroupFieldList: string[],
  rowGroupHeaderFieldList: { label: string; value: string }[]
) => {
  if (rowGroupFieldList.length === 0) return {};

  return {
    groupBy: rowGroupFieldList,
    groupToggleElement: 'header',
    groupHeader: function (value, count, data, group) {
      //value - the value all members of this group share
      //count - the number of rows in this group
      //data - an array of all the row data objects in this group
      //group - the group component for the group

      if (!rowGroupHeaderFieldList.length) {
        return `
            ${value}<span style='margin-left: 32px;'>(${count} 条记录)</span>
          `;
      }
      let content = '';

      rowGroupHeaderFieldList.forEach(({ label, value }) => {
        content += `
            <div style="margin-right: 32px;">
              <span>${label}: </span>
              <span>${data[0]?.[value]}</span>
            </div>
          `;
      });

      return `
          <div style="display: inline-block;">
            <div style="display: flex; align-items: center;">
              ${content}
              <div>(${count} 条记录)</div>
            <div>
          <div>
        `;
    },
  };
};

function genIndexedDBOptions(
  enableIndexedDBQuery: boolean,
  indexdbConfigs: Record<string, any>,
  tableTypeFlag?: string
) {
  if (!enableIndexedDBQuery) {
    return {};
  }

  const {
    dexie,
    tableName,
    dropdownIndexedDBTableName,
    simpleBuiltinQueryCondition,
    dropdownSimpleBuiltinQueryCondition,
  } = indexdbConfigs;
  console.log(
    'genIndexedDBOptions',
    tableName,
    simpleBuiltinQueryCondition,
    dropdownSimpleBuiltinQueryCondition
  );
  return {
    dexie: dexie,
    dexieTable:
      tableTypeFlag === TableTypeFlag.customTableSelect
        ? dropdownIndexedDBTableName
        : tableName,
  };
}
