// table_with_cahrt.js v0.1.20191118
// simple tooltip, filter window

(function(){
    //get_all_sample();
    // データやチャートの状態を格納する変数。
    var r_inf, r_infs={}, ginf, s_r_infs=[],tmp_max = 16, default_domain = [0, 16],
        chart_cols = ["value","sample_description", "sample_type", "UBERON", "CL"], group_cols = ["values", "sample_description", "sample_type", "UBERON", "CL"],
        arranged_data = [],gene_names = [], sample_data = [],
        default_legend = "sample",
        mygene_fields = "name,alias,summary,symbol,refseq,unigene,taxid,type_of_gene,go,ensembl,entrezgene";
    // チャートの状態
    var chart_state = {"sorted": false, "selected": "",  "grouped": false, "ppty": "value", "popover": false};
    //var sorted = false, grouped = false,
    var ppty="value", popover = false;
    // チャート描画のためのパラメータ
    var cell_w = 250, cell_h = 16, cell_padding_l = 10, cell_padding_r = 60,  cell_padding_tb = 2,
        colors = d3.scaleOrdinal().range(["steelblue", "tomato", "yellowgreen", "Navy", "orange", "maroon", "olive"]),
        symbol = [ d3.symbol().size(30).type(d3.symbolTriangleLeft), d3.symbol().size(30).type(d3.symbolTriangleRight)];

    var annotation_dct = {"value": "log2_Mean", "sample": "RefEx_Sample_ID",
                "sample_type": "Sample types category","experiment":"Experiments category",
                "refex": "RefEx_ID", "sample_description":"Description", "UBERON": "UBERON label",
                "CL": "CL label", "NCIT": "NCIT label", "stage": "Developmental stage"};

    var scalex = d3.scaleLinear();

    function getUrlParams() {
        var params = location.search.substring(1);
        var obj = JSON.parse('{"' + decodeURI(params).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g,'":"') + '"}')
        return obj
    }

    // 類似する遺伝子の情報を表示
    column_list_changed = function (l){
        chart_cols = l;
        group_cols = chart_cols.slice(1);
        group_cols.unshift("values");
        learn_more([gid])
    };

    var gid_lst = getUrlParams().gid.split(",");
    var gid = gid_lst[0];
    if (gid_lst.length > 1){
        get_refex_info_more(gid_lst)
    }
    var organism = getUrlParams().organism;

    // gidに対応する、symbol, name, organismを取得してginfを設定
    get_refex_info(gid);

    //遺伝子の情報をmygeneより取得
    get_mygene_info(gid);

    // get_refex_info完了しデータを取得したのち実行する
    function get_refex_info_done() {
        obs.trigger("geneinfoLoaded", ginf);
        // s_r_infsを更新する
        store_data(ginf, r_inf);
        // chart描画
        learn_more([gid]);
        // 比較する遺伝子を読み込んだ場合、ヘッダの情報を書き換える
        if(chart_state.grouped == true){
            var sample_info = s_r_infs[1]["info"]["symbol"];
            state_changed("and", sample_info);
        }
    }

    // 選択した遺伝子のgene idでrefexの情報を取得
    function get_refex_info(gid) {
        return new Promise(function (resolve, refect) {
            var u = refex_cash_api + gid;
            $.getJSON(u)
                .success(function (d) {
                    // r_infとginfをグローバル変数に格納
                    r_inf = d["r_inf"];
                    var test_ids = r_inf.map(function (d) {
                        return d.RefEx_Sample_ID;
                    });
                    /* r_infはRefEx_Sample_IDでsort
                    r_inf.sort(function (a, b) {
                        return d3.ascending(a.RefEx_Sample_ID, b.RefEx_Sample_ID)
                    });
                    */
                    //r_inf = sort_data_with_value(r_inf);
                    ginf = d["ginf"];
                    get_refex_info_done();
                })
        })
    }
    
    function get_refex_info_more(gids) {
        chart_state.selected = "";
        // 1遺伝子ごとの処理を定義
        var get_multi_data = gids.map(function(i){
            var url_tmp = refex_cash_api + i;
            return $.getJSON(url_tmp, function (d) {
                var r_inf_tmp = d["r_inf"];
                //log2_Meanでソート
                //r_inf_tmp = sort_data_with_value(r_inf_tmp);
                var ginf_tmp = d["ginf"];
                // symbol, name, idのオブジェクトとソート済みのlog2_Meanなどを含むアノテーション
                store_data(ginf_tmp, r_inf_tmp);
                var info = r_infs[i];
                s_r_infs.push({info:info[0], val: obj2d(info)})
            } )
        });

        // getjsonを呼ぶ
        $.when.apply($, get_multi_data).done(function () {
            bbchart.chart(s_r_infs)
        })
    }


    // チャートの状態を変更した際ヘッダの情報を書き換える
    function state_changed(s, g){
        var obj = {"state": s, "genes": g};
        obs.trigger("chartstateChanged", obj)
    }

    //取得したオブジェクトをオブジェクトr_infsに一時保存する
    function store_data(c, d) {
        // ginf, r_infを引数に
        // {gid: gid, array:[gin, r_inf]をr_infsに定義する
        var i = c.id;
        var a = [c, d];
        r_infs[i] = a;
    }

    function learn_more(g) {
        var info =  r_infs[gid];

        // obj2dでchart描画用のデータに変換
        // gidがs_r_infsに二重に登録されない場合はr_infをpushする
        var ids = s_r_infs.map(function (d) {
            return d.info.id
        });
        // ページを最初に開いて変数に配列が格納されていない状態または
        // 追加するgidが配列に含まれていない状態ではs_r_infsにオブジェクトを追加
        if(s_r_infs.length == 0 ){
           s_r_infs.push({info: info[0], val: obj2d(info)});
        }else if(ids.indexOf(gid[0]) == -1){
            // カラムを操作しただけのケースはデータを変更しない
            //s_r_infs.push({info: info[0], val: obj2d(info)});
        }
        bbchart.chart(s_r_infs);
    }

    //d3.js用のデータに整形し返す
    function obj2d(e) {
        //exp_val => d.value, sample => d.sampleにハッシュの値をmapし、ハッシュを返す。
        var i = e[1].map(function (d) {
            return {"value": d3.format(".3f")(+d['log2_Median']), "sample": d.RefEx_Sample_ID,
                "sample_type": d["Sample types category"],"experiment":d["Experiments category"],
                "refex": d.RefEx_ID, "sample_description":d.Description, "UBERON": d["UBERON label"], "sex": d.Sex, "age": d.Age,
                "CL": d["CL label"], "NCIT": d["NCIT label"], "stage": d["Developmental stage"]}
        });
        return i
    }

    // 描画
    var twc = d3.select("#barchart .chart");
    // Define the div for the tooltip
    var simple_tip = twc.append("div")
        .attr("class", "tooltip")
        .style("z-index", 100)
        .style("position", "absolute")
        .style("opacity", 0);
    var table = twc.append("table").attr("class","sample_list table table-striped table-sm").attr("id", "refex_table");
    var tbody = table.append("tbody");
    var chart_head = d3.select("#chart_head");
    var thead = chart_head.append("table").append("thead");

    // 凡例
    var legends = d3.select("#legends").append("svg").attr("width", "500px").attr("height", "35px");
    var legend_view = legends.append('g').attr('class', 'legend_view').attr('transform', 'translate(0, 2)');

    var sample_info_rows;

    // theadにcolnameとxaxis（& label）を表示する
    var chart_header = thead.append("tr").attr("height", 40);


    var bbchart = {
        types: {},
        config: {},
        chart: function(data){
            var type = this.config[data.length === 1 ? 1 : 2];
            this.types[type].chart(data)
        }
    };
    bbchart.config = {
        1: 'isSingle',
        2: 'isGrouped'
    };

    bbchart.types.isSingle = {
        chart: function(data){
            reset_chart()
            // d3.jsに渡す前に表示したい項目のみデータをフィルターする
            // &表示したいメタデータを書くrowsにマージする必要がある。
            sample_data = data[0].val;
            // 表示するデータのみ残す
            sample_data = arrange_data(sample_data);
            sample_data = sort_data_with_value(sample_data);

            /*
            var scalex = d3.scaleLinear().range([0, cell_w - cell_padding_l * 2]).domain([0, d3.max(sample_data, function (d) {
                return d.value
            })]);
            */
            // domainを全ての遺伝子で固定
            scalex.range([0, cell_w - cell_padding_l * 2]).domain(default_domain);

            // legende設定
            colors.domain(d3.map(sample_data, function (d) {
                // domainにgene_idを渡す
                return d["sample type"]
            }).keys());

            chart_header.selectAll("th")
                .data(d3.entries(sample_data[0]))
                .exit().remove();

            chart_header.selectAll("th")
                .data(d3.entries(sample_data[0]))
                .enter().append("th")
                .append(function (d) {
                    return draw_axis(d)
                });

            draw_chart(sample_data);

            set_column_width();

            //$('.dataTables_length').addClass('bs-select');
        }
    };

    bbchart.types.isGrouped = {
        chart: function (data) {
            reset_chart();
            // s_r_infsからval（sampleの情報）のみのobjctを生成
            var sample_vals = [];
            data.forEach(function(d){
                sample_vals.push(d.val)
            });
            // 遺伝子ごと色分けするスケール
            // ソートにもsymbolのインデックスを利用
            gene_names = s_r_infs.map(function(d){
                // symbolまたはgene idのarray
                var s = d.info.symbol ? d.info.symbol : d.info.id;
                return s
            });

            // 元データのオブジェクトに、screenerで選択した比較する遺伝子のvalueを加える（values: list）
            sample_data = sample_vals[0].map(function (d,i) {
                var vals = [];
                sample_vals.forEach(function (e) {
                    vals.push(e[i]["value"])
                });
                d["values"] = vals;
                return d
            });

            // 不必要な項目をのぞいて、重複する項目を削除
            sample_data = arrange_grouped_data(sample_data);
            tbody.selectAll(".table_row").remove();

            // char_sate.selected にgene_namesの値が入っていたらその遺伝子の発現量でソート
            if (gene_names.indexOf(chart_state.selected) > -1){
                var i = gene_names.indexOf(chart_state.selected);
                sample_data.sort(function (a, b) {
                    return b.values[i] - a.values[i]
                })
            }

            // domainは[0, 8]に固定
            scalex.range([0, cell_w - cell_padding_l * 2]).domain(default_domain);

            //colors.domain([...Array(sample_data[0].values.length).keys()]);
            colors.domain(gene_names);

            //var column_data = Object.assign({},sample_data);
            //delete column_data[0].values;

            chart_header.selectAll("th")
                .data(d3.entries(sample_data[0]))
                .enter().append("th")
                .append(function (d) {
                    return draw_axis(d)
                });

            draw_charts(sample_data);
            chart_state.grouped = true;

            var legend = d3.legendColor().orient('horizontal').shapeWidth(80).shapeHeight(10).shapePadding(4);
            legend.scale(colors);
            legend_view.call(legend);

            $("g.cell").on("click", function (e) {
                var selected_gene = $(this).find(".label").text();
                // grouped & gene_selectedなフラグを立てる
                chart_state.selected = selected_gene;
                bbchart.chart(s_r_infs);
            })

            // grouped chartのデータを整形
            function arrange_grouped_data(d){
                var arranged_data = d.map(function(e){
                    var obj = {};
                    group_cols.forEach(function (c) {
                        obj[c] = e[c]
                    });
                    return obj
                });
                return arranged_data
            }

            set_column_width();
        }
    };


    // 発現値のx軸を描画する
    function draw_axis(d) {
        // columnごと{key, value}が渡される
        var div = document.createElement("div");

        if (d.key == "value" || d.key == "values"){
                var svg = d3.select(div).attr("class", "tpm").append("svg")
                    .attr("class", "xscale")
                    .attr("width",cell_w + cell_padding_r)
                    .attr("height", 35);
                var xscale = d3.scaleLinear().domain([0, tmp_max]).range([0, cell_w - (cell_padding_l*2)]);
                svg.append("g").attr("transform", "translate(10,30)")
                    .call(d3.axisTop(xscale));
                svg.append("g").attr("transform", "translate(" + (cell_w/4 + 8)  + ",8)").append("text").text(" Median [log2(TPM+1)]");
                //d3.select(div).append("span").style("margin-top", "6px").append("i").attr("class","fas fa-sort");

            return div
        } else {
            d3.select(div)
                //.html(d.key);
                .html('<span class="f-btn" rel="popover" data-name="'+ d.key +'">' + d.key + ' <i class="fas fa-filter" data-name="'+ d.key +'"></i></span>');

            return div
        }
    }

    // bar, axis, brushを削除する
    function reset_chart() {
        chart_header.selectAll("th").remove();
        tbody.selectAll("tr").remove();
        legend_view.selectAll('.legendCells').remove();
    }

    // 発現が類似する遺伝子を表示する
    // 遺伝子の選択操作はgroup viewの表示のトリガとする
    function show_screener(){
        // feature gene : gid
        // 遺伝子類似度データを読み込む
        var gene_list = [];
        get_similar_gene()
            .then(function (value) {
                return value
            })
            .then(function(lst){
                // レスポンスは {gene_id: , symbol: , name: } オブジェクト
                obs.trigger("similarGeneLoaded", lst)
            });

        // モーダルウィンドウに遺伝子名を書き出し、モーダルウィンドウを表示する
        $("#compare").modal();
        //$("#ps_screener").modal()

    }

    // 入力したgidとの類似度を取得し、類似度の高い遺伝子のgidを取得する
    function get_similar_gene() {
        return new Promise(function(resolve){
            var target_dst = organism ? refex_api + "similarity/"+ gid + "?organism=" + organism : refex_api + "similarity/"+ gid;
            fetch(target_dst)
                .then(function (response) {
                    return response.json()
                })
                .then(function (json) {
                    resolve(json)
                });

        })
    }

    // riot tagか利用するため、グローバルな関数として定義
     get_similar_info = function (g){
        show_state()
        if(!r_infs[g]) get_refex_info_more(g);
        $("#compare").modal('hide');
    };

    /*
    sample_data（s_r_infs[0].value）をsort
    */
    function sort_data(p) {
        var tmp_data = s_r_infs[0].val.slice();
        var sample_data_sorted = tmp_data.sort(function (a, b) {
            return b.value - a.value
        });
        return sample_data_sorted
    }

    function sort_data_with_value(r){
        r.sort(function (a, b) {
            return b.value - a.value
            //return b.log2_Mean - a.log2_Mean
        });
        return r
    }

    function sort_group_data() {
        // TPMの値の(max - min)の差でsample_dataをソートし返す
        sample_data.forEach(function(d){
            d.dif = d3.max(d.values) - d3.min(d.values)
        });
        var sorted_data = sample_data.sort(function(a, b){
            return b.dif - a.dif
        });

        sorted_data.forEach(function (d) {
            delete d.dif;
        });

        return sorted_data
    }

    function sort_group_data_wg(s) {
        //選択された遺伝子の値の大きさでソート
        // s_r_infsよりclickされた遺伝子のarrayのindexを取得
        var symbols = s_r_infs.map(function (d) {
            return d.info.symbol
        });
        var n = symbols.indexOf(s);
        // s_r_infsの選択された遺伝子のvlues[n]の値で
        var sorted_data = sample_data.sort(function(a, b){
            return b.values[n] - a.values[n]
        });
        return sorted_data
    }

    // 置き換え検討。APIがname: 類似度のオブジェクトを返すようにし、それに合わせる。
    function secondMax(arr, i) {
        arr[i] = 0;
        var index_max = arr.indexOf(Math.max.apply(null, arr));
        return index_max
    }

    function thirdMax(arr, i, j) {
        arr[i] = 0;
        arr[j] = 0;
        var index_max = arr.indexOf(Math.max.apply(null, arr));
        return index_max
    }

    // dataをfantom5のannotation-colname変換辞書でd3.jsの描画用に整形する
    function arrange_data(d){
        var data_tmp = d.map(function(e){
            var obj = {};
            // 定義済みの項目リストに合わせ（col_name変更・必要な要素のみ選択）オブジェクトを生成
            chart_cols.forEach(function (c) {
                obj[c] = e[c]
            });
            return obj
        });
        return data_tmp
    }

    function draw_chart(d) {
        sample_info_rows = tbody.selectAll("tr")
            .data(d)
            .enter().append("tr").attr("class", "table_row").attr("height", cell_h);

        sample_info_rows.selectAll("td")
            .data(function (d) {
                // sample_dataの各要素が渡される
                //return d3.entries(d)

                // objectをk:vのペアごと分解してlist of objectに変形する
                // objectは参照渡しであるため複製する
                var ori_obj = Object.assign({}, d);
                delete ori_obj.value;
                var tmp_obj = d3.entries(d);
                tmp_obj.forEach(function (e) {
                    e = Object.assign(e, ori_obj)
                })
                return tmp_obj
            })
            .enter().append("td")
            .append(function (d) {
                return convert_value(d)
            })
            .attr("class", function (d) {
                return "sample_" + d.key
            })
            .attr("height", cell_h + 7);
    }

    function draw_charts(d) {
        sample_info_rows = tbody.selectAll("tr")
            .data(d)
            .enter().append("tr").attr("class", "table_row").attr("height", cell_h);

        sample_info_rows.selectAll("td")
            .data(function(d){
                // sample_dataの各行が渡される
                // 表示する項目をfilterする
                return d3.entries(d)
            })
            .enter().append("td")
            .append(function (d) {
                return convert_values(d)
            })
            .attr("class", function (d) {
                return "sample_" + d.key
            })
            .attr("height", cell_h + 7);
    }

    // valueの項目ではsvgに変換した発現量、その他ではそのままテキストを返す
    function convert_value(d){
        var div = document.createElement("div");
        if (d.key == "value"){
            return lolipop_chart(d)
        }else{
            d3.select(div).append("text").text(d.value)
            return div
        }
    }

    function convert_values(d){
        var div = document.createElement("div");
        if (d.key == "values"){
            return lolipop_charts(d)
        }else{
            d3.select(div).append("text").text(d.value)
            return div
        }
    }


    // svg objectを生成しtable描画処理に返す
    function lolipop_chart(d){
        var scaley = d3.scaleBand().domain(["0", "1"]).range([0, cell_h]);
        var sample_chart = document.createElement("div");
        var svg = d3.select(sample_chart).append("svg")
            .attr("class", "lp_chart")
            .attr("width", cell_w + cell_padding_r).attr("height", cell_h + 7);
        var elem = svg.append("g").attr("transform", "translate(" + cell_padding_l + "," + cell_h/2 + ")");


        elem.append("rect")
            .attr("x", 0)
            .attr("width", scalex(d.value))
            .attr("y", 0)
            .attr("height", 1)
            .attr("class", "chart_line")
            .attr("fill", "#444");

        // lolipop chartの背景にtooltip表示用のイベントをbindするrectを設置
        elem.append("rect")
            .attr("x", 0)
            .attr("width", cell_w + cell_padding_r)
            .attr("y", -10)
            .attr("height", cell_h)
            .attr("fill", "#ccc")
            .attr("class", "bg")
            .attr("opacity", 0)
            .on("mouseover", function () {
                var x = d3.event.pageX;
                var y = d3.event.pageY;
                hide_annotation();
                show_annotation(d.value, x, y)
            })
            .on("mouseout", function(){
                hide_annotation()
            });

        elem.append("circle")
            .attr("cx", scalex(d.value))
            .attr("r", 5)
            .attr("fill", function(e, i){
                return colors(d["sample type"])
            })
            .on("mouseover", function (e) {
                var x = d3.event.pageX;
                var y = d3.event.pageY;
                    hide_annotation();
                    show_annotation(d.value, x, y)
            })
            .on("mouseout", function(){
                    hide_annotation()
            });

        // y axis
        svg.append("g").attr("class", "yaxis").attr("width", 5).attr("height", cell_h)
            .append("line")
            .attr("stroke", "#444")
            .attr("x1", cell_padding_l)
            .attr("x2", cell_padding_l)
            .attr("y1", 0)
            .attr("y2", cell_h + 7);

        function show_annotation(v, x, y) {
            simple_tip.transition()
                .duration(100)
                .style("opacity", 0.9);
            simple_tip.html("Expression(TPM): " + v)
                .style("left", "200px")
                .style("top", y + "px");
            }

        return sample_chart
    }

    function lolipop_charts(d) {
        var kv = d;
        //key:"values", value: Arrayを渡される
        var gidx = s_r_infs.map(function (d, i) {
            return i
        });

        var col_h = s_r_infs.length * cell_h;
        // yscaleには選択された遺伝子リストの序数を渡す
        var scaley = d3.scaleBand().domain(gidx).range([0, col_h]);
        var sample_chart = document.createElement("div");
        var svg = d3.select(sample_chart).append("svg")
            .attr("class", "lp_chart")
            .attr("width", cell_w + cell_padding_r).attr("height", col_h)
            .on("mouseover", function () {
                hide_annotation()
                var x = d3.event.pageX;
                var y = d3.event.pageY;
                show_annotations(kv, x, y)
            })
        var elem = svg.append("g").attr("transform", "translate(" + cell_padding_l + "," + cell_h/2 + ")");

        // valuesをbind
        var charts = elem.selectAll(".g_chart")
            .data(d.value)
            .enter().append("g").attr("class", "g_chart").append("line")
            .attr("x1", 0)
            .attr("x2", function(e){
                return scalex(e)
            })
            .attr("y1", function(d,i){
                return scaley(i)
            })
            .attr("y2", function(d,i){
                return scaley(i)
            })
            .attr("class", "chart_line")
            .attr("stroke", "steelblue");


        // lolipop chartの背景にtooltip表示用のイベントをbindするrectを設置
        elem.selectAll(".g_chart").append("rect")
            .attr("x", 0)
            .attr("width", cell_w)
            .attr("y", function (e,i) {
                return scaley(i) -10
            })
            .attr("height", cell_h)
            .attr("class", "bg")
            .attr("opacity", 0)
            .on("mouseout", function(){
                hide_annotation()
            });


        elem.selectAll(".g_chart").append("circle")
            .attr("cx", function(e){
                return scalex(e)
            })
            .attr("cy", function (e,i) {
                return scaley(i)
            })
            .attr("r", 5)
            .attr("fill", function (d,i) {
                return colors(gene_names[i])
            })
            .on("mouseout", function () {
                hide_annotation()
            });

        // y axis
        svg.append("g").attr("class", "yaxis").attr("width", 5).attr("height", cell_h)
            .append("line")
            .attr("stroke", "#444")
            .attr("x1", cell_padding_l)
            .attr("x2", cell_padding_l)
            .attr("y1", 0)
            .attr("y2", col_h)
            .on("mouseout", function () {
                hide_annotation()
            });

        function show_annotation(v,i, x, y) {
            var annotation_tmp = '<div>' + gene_names[i] + '<br> Expression(log2(TPM+1)): ' + v + '</div>';
            simple_tip.transition()
                .duration(100)
                .style("opacity", 0.9);
            simple_tip.html(annotation_tmp)
                .style("left", cell_w + "px")
                .style("top", (y - 4) + "px")
            }

        function show_annotations(kv, x, y) {
            var annotation_title = '<div class="anno_title">Expression(log2(TPM+1))</div>';
            var annotation_kv = kv.value.map(function (v,i) {
                return '<div>' + gene_names[i] + ': ' + v + '</div>'
            });
            var annotation = annotation_title + annotation_kv.join("")

            //var annotation_tmp = '<div class="anno_tmp">' + gene_names[i] + '<br> Expression(log2(TPM+1)): ' + v + '</div>';
            simple_tip.transition()
                .duration(100)
                .style("opacity", 0.9);
            simple_tip.html(annotation)
                .style("left", cell_w + "px")
                .style("top", (y - 4) + "px")
        }

        return sample_chart
    }


    // annotation名（&asc,desc）を引数に、~をソートし、chartを再描画する
    function sort_data_with_annotation(o) {
        show_state()
        // popoverをhide
        $("#pop").animate({opacity: 0});
        $("#pop").css({display: "none"});

        //選択中のカラム名をr_infのkeyに変換 //
        //var k = annotation_dct[popover];

        // d3.js用オブジェクトに変換
        var tmp_data = s_r_infs[0].val.slice();
        var arranged_data = arrange_data(tmp_data);

        // sort r_infをスライスして新しいobjectをつくりデータをソート（文字列のソート）
        var sorted_data = arranged_data.sort(function (a, b) {
            switch(o) {
                case "desc":
                    if (is_null(a[popover]) > is_null(b[popover])) {
                        return 1
                    } else {
                        return -1
                    }
                case "asc":
                    if (is_null(a[popover]) < is_null(b[popover])) {
                        return 1
                    } else {
                        return -1
                    }
            }
        });

        // ソートしたデータで再描画
        tbody.selectAll("tr").remove();
        draw_chart(sorted_data);

        // ソート状態を保存表示
        // 表示
        if (popover){
            $("span.f-btn").css({"color":"#4d4d4d"});
            $("span.f-btn i").css({"color":"#4d4d4d"});
            $("span.f-btn[data-name=" + popover +"]").css({"color": "#ff7f0e"});
            $("span.f-btn[data-name=" + popover +"] i").css({"color": "#ff7f0e"});
        }

        // sorted = true; // ソートkeyを指定する
        // state_changed("Sorted with expression level." , "");
    }

    function is_null(s){
        return typeof s == "string" ? s : ""
    }

    function filter_data_with_annotation(s) {
        $("#pop").animate({opacity: 0});
        $("#pop").css({display: "none"});

        var tmp_data = s_r_infs[0].val.slice();
        var arranged_data = arrange_data(tmp_data);

        var filtered_data = arranged_data.filter(function (d) {
            return String(d[popover]).indexOf(s) != -1
        });

        // filterしたデータで再描画
        tbody.selectAll("tr").remove();
        draw_chart(filtered_data)

        // filter状態の表示と保存
        if (popover){
            $("span.f-btn").css({"color":"#4d4d4d"});
            $("span.f-btn i").css({"color":"#4d4d4d"});
            $("span.f-btn[data-name=" + popover +"]").css({"color": "#ff7f0e"});
            $("span.f-btn[data-name=" + popover +"] i").css({"color": "#ff7f0e"});
        }

    }

    function reset_data_filter() {
        var tmp_data = s_r_infs[0].val.slice();
        var arranged_data = arrange_data(tmp_data);
        tbody.selectAll("tr").remove();
        draw_chart(arranged_data)
    }

    // event delegation
    $("body").on("click", ".f-btn", function (e) {
        var target_name = e.target.getAttribute("data-name");
        if (popover == false) {
            show_state()
            var current_z_index = parseInt($(this).css("z-index"));
            highest_z_index = current_z_index + 1;
            $("#pop").css({display: "block", opacity: 1, zindex: highest_z_index, left: e.pageX});
            reset_input_text();
            popover = target_name;
        }else if(popover != target_name){
            show_state()
            // 新しいpopoeverを開く場合
            $("#pop").css({display: "block", opacity: 1, zindex: highest_z_index, left: e.pageX});
            reset_input_text();
            popover = target_name
        } else {
            close_pop();
        }
    });

    function reset_input_text(){
        $("#filter_word").val("");
    }

    function close_pop(){
        $("#pop").animate({opacity: 0}, 200, function () {
           $("#pop").css({display: "none"});
        });
        popover = false;
    }

    // column listを変更した際、ヘッダのセルの幅もあわせて変更する
    function set_column_width() {
        // tbodyのtd, thを取得
        var cell_widths = Array.from(document.getElementsByTagName("td")).slice(0,chart_cols.length)
        var ths = document.getElementsByTagName("th");
        cell_widths.forEach(function (d, i) {
            ths[i].style.width = d.offsetWidth + "px";
        })
    }

    function hide_annotation() {
        simple_tip.transition()
            .duration(200)
            .style("opacity", 0)
    }

    // 遺伝子情報をmygeneより取得
    function get_mygene_info(gid) {
        fetch("https://mygene.info/v3/gene/" + gid + "?fields=" + mygene_fields)
            .then(function (res) {
                return res.json()
            })
            .then(function(jsn){
                obs.trigger("showmygene",jsn)

            })
    }

    $("#btn_show_ids").on("click", function () {
        show_state()
        // formの値取得＆gene idの配列にテキストをパース
        var id_tmp = $("#input_gene_ids").val()
        id_tmp = id_tmp.replace(/\s+/g, "");
        var id_arr = id_tmp.split(",");

        // 比較するgene id配列を引数に再描画
        //遺伝子情報を取得し、再描画メソッドを呼ぶ
        get_refex_info_more(id_arr);
        $("#compare").modal("hide");

    });

    $("#btn_close_compare_window").on("click", function () {
        $("#compare").modal('hide');
    });

    // データのsort&filter optionのハンドラ
    $("#sort_desc").on("click", function () {
        show_state()
        sort_data_with_annotation("desc")
        popover = false
    });

    $("#sort_asc").on("click", function () {
        show_state()
        sort_data_with_annotation("asc")
        popover = false;
    });
    $("#filter_column").on("click", function(){
        filter_data_with_annotation($("#filter_word").val())
        popover = false;
    });
    $("#close_pop").on("click", function () {
        close_pop();
        popover = false;
    });

    $("#release_filter").on("click", function () {
        $("#pop").animate({opacity: 0});
        $("#pop").css({display: "none"});
        if (popover){
            $("span[data-name=" + popover +"]").css({"color": "#4d4d4d"});
            $("span[data-name=" + popover +"] i").css({"color": "#4d4d4d"});
        }

        reset_data_filter();
        popover = false;
    });

    $("#compare_genes").click(function(){
        //hide_annotation()
        show_state()

        // grouped==trueであればデフォルトのチャートを表示
        // falseならscreenerを呼ぶ
        switch (chart_state.grouped) {
            case  false:
                chart_state.grouped = true;
                show_screener();
                break;
            case true:
                tbody.selectAll("tr.table_row").remove();
                // s_r_infsの初期化
                s_r_infs = s_r_infs.slice(0, 1);
                bbchart.chart(s_r_infs);
                chart_state.grouped = false;
                state_changed("", "");
                break;
        }
    });

    // sort with selected gene
    function chart_data_selected_gene(s) {
        // groupedの状態でcallされる
        var sorted_group_data = sort_group_data_wg(s);
        draw_charts(sorted_group_data)
    }
    // sort button
    function sort_data_with_diff() {
            // 以下差分の大きさでソート
            ppty = "value";

            tbody.selectAll(".table_row").remove();
            if (chart_state.sorted == false && chart_state.grouped == false) {
                // sortするプロパティを指定。デフォルトでtpm
                var sorted_data = sort_data(ppty);
                sorted_data = arrange_data(sorted_data);
                draw_chart(sorted_data);
                chart_state.sorted = true;
                state_changed("Sorted with expression level." , "");

            }
            else if(chart_state.sorted == true && chart_state.grouped == false) {
                // sorted状態であれば元のデータの描画に戻る
                bbchart.chart(s_r_infs);
                chart_state.sorted = false;
                state_changed("", "");
            }
            else if (chart_state.sorted == false | chart_state.grouped == true){
                // min-max の差分でソートする処理
                var sorted_group_data = sort_group_data();
                draw_charts(sorted_group_data)
                // headerのxaxisを変更する

                chart_state.sorted = true;
                // 比較する遺伝子が追加された際の処理を検討する必要あり
                var sample_info = s_r_infs[1]["info"]["symbol"];

                state_changed("Sorted expression level difference with ", sample_info);

            } else {
                bbchart.chart(s_r_infs);
                chart_state.sorted = false;
                chart_state.grouped = false;
                s_r_infs = s_r_infs[0];
                state_changed("", "");
            }
    }


    function show_state() {
        console.log("chart_state: " + JSON.stringify(chart_state))
        console.log("length s_r_infs: " + s_r_infs.length)
    }


})();