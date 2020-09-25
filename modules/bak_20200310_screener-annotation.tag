<screener-annotation>
    <!-- 20200310 popup checkbox version  -->
<label>Search for Sample Specific Genes</label>
                <label><span class="addfilter" data-toggle="popover" data-filter="extra_annotation">
                    <i class="fas fa-plus-square"></i>Add anoter filter
                </span></label>

                <div id="sample_type_filter" class="navbar-form">
                    <div class="panel panel-default annotation">
                        <div class="panel-body">
                            <div class="annotation-name">Sample types category </div>
                            <div class="add_selector" data-toggle="popover"
                                 data-annotations="sample_type_category"><i class="fas fa-plus-square"></i>select value</div>
                        </div>
                    </div>
                </div>

                <virtual each={obj, i in extra_filter}>
                <div id={filter_ids[i]} class="navbar-form">
                    <div class="panel panel-default annotation">
                        <div class="panel-body">
                            <div class="annotation-name"> {obj} </div>
                            <div class="add_extra_selector {filter_ids[i]}" data-toggle="popover"
                                 data-annotations={obj} data-values={filter_ids[i]} ><i class="fas fa-plus-square"></i>select value</div>
                        </div>
                    </div>
                </div>
                </virtual>


                <div id="sample_type_category" class="hide">
                    <div class="radio">
                        <label><input type="radio" name="radio_sample_type" id="sample_type_1" value="cell lines"> cell lines</label>
                    </div>
                    <div class="radio">
                        <label><input type="radio" name="radio_sample_type" id="sample_type_2" value="stem cells"> stem
                            cells</label>
                    </div>
                    <div class="radio">
                        <label><input type="radio" name="radio_sample_type" id="sample_type_3" value="primary cells">
                            primary cells</label>
                    </div>
                    <div class="radio">
                        <label><input type="radio" name="radio_sample_type" id="sample_type_4" value="tissues">
                            tissues</label>
                    </div>
                </div>

                <!-- extra annotation names -->
                <div id="extra_annotation" class="hide">
                <virtual each={name in annotation_names}>
                    <div class="radio">
                        <label><input type="radio" name="extra_annotation" value={name}> {name}</label>
                    </div>
                </virtual>
                </div>

                <!-- extra annotation values -->
                <div id="others" class="hide">
                    <virtual each={v, k in extra_annotation}>
                    <div id="{k}_source" class="cv-options">
                        <virtual each={val in v}>
                        <div class="radio cv-selector">
                            <label><input type="radio" name="others" value={val}> {val}</label>
                        </div>
                        </virtual>
                    </div>
                    </virtual>
                </div>

                <div id="samples" class="hide">
                    <div class="radio">
                        <label><input type="radio" name="radio" id="res00x" value="cell lines"> cell lines</label>
                    </div>
                </div>


    <script>
        var self = this;
        // sample Specific geneを検索するためのアノテーション
        var annotation_used = []; // [{"annotation": "Sample type category", "value": "tissues"}, ]
        var selected_gene = [];
        var extra_filter = [];
        var filter_ids = [];
        var extra_annotation_values = {};
        var delay = 200;
        /*
        組織特的発現による遺伝子filter
        */
        //window.onload = function(e){
        window.onload = setTimeout(tag_onload, delay);
        //$(document).ready(function () {
        function tag_onload() {
            // extra_annotation を描画
            self.annotation_names = human_fantom5_annotations.map(function (obj) {
                return obj.title
            });
            self.update();

            // CV選択
            $('.add_selector[data-toggle="popover"]').popover({
                html: true,
                container: "body",
                content:function () {
                    var divid = "#" + $(this).data("annotations");
                    return $(divid).html()
                }
            });

            $('.add_selector[data-toggle="popover"]').on('shown.bs.popover', function () {
                // radio buttonを選択した際に
                $('input[name="radio_sample_type"]:radio').change(function () {
                    var annotation = "Sample types category";
                    var val = $(this).val();
                    var selector = "#sample_type_filter .add_selector";
                    annotation_manager(annotation, val);
                    hide_add_selector(selector);
                    show_annotation_value(annotation, "sample_type_filter", val);
                    hide_annotation_popover();
                    show_filtered_gene()
                });

            });

            // annotation filters 表示
            // dividをothersからでは無くfilter_idで指定
            // data source (.hide)をothterで作るのでは無くfilter_id + sourceなどにする

            $('.addfilter[data-toggle="popover"]').popover({
                html: true,
                container: "body",
                content:function () {
                    var divid = "#" + $(this).data("filter");
                    return $(divid).html()
                }
            });

            // Add another filter選択しfilterを表示した際の設定
            $('.addfilter[data-toggle="popover"]').on('shown.bs.popover', function () {
                // radio buttonを選択した際に
                $('input[name="extra_annotation"]:radio').change(function () {
                    var title = $('input[name="extra_annotation"]:checked').val();
                    var annotation = human_fantom5_annotations.filter(function (obj) {
                        return obj.title == title;
                    });
                    var annotation_name = annotation[0]["name"];
                    extra_filter.push(annotation[0]["title"]);
                    // annotation nameの空白を_で置換しIDとして利用する
                    var filter_id = annotation_name.replace(" ", "_");

                    // filter_idsに取得したfilter_idが存在しなければ処理を続ける
                    if (!filter_ids.includes(filter_id)) {
                        filter_ids.push(filter_id);

                        // extra_filterの表示に利用する変数を定義
                        //self.filter_id = filter_id;
                        //extra_annotation_valuesをfilter_ids
                        self.extra_filter = extra_filter;
                        self.filter_ids = filter_ids;
                        self.update();

                        // popoverをhide()
                        hide_annotation_popover();

                        // extra_annotation_values: あるannotationの値リスト取得しpopoverに描画
                        // .hideでイテレーションするextra_filterのvalueを格納
                        var extra_filters = [];
                        annotation2cv(annotation_name)
                            .then(function (result) {
                                return result
                            })
                            .then(function (lst) {
                                extra_annotation_values[filter_id] = lst;
                                self.extra_annotation = extra_annotation_values;
                                self.update();
                            });

                        // extra_filterのpopoverを設定
                        // selectorをfilter_idを追加して、詳細に設定する必要がある
                        $('.' + filter_id + '.add_extra_selector[data-toggle="popover"]').popover({
                            html: true,
                            container: "body",
                            content: function () {
                                var divid = "#" + $(this).data("values");
                                // #others が渡される。otherはextra_annotation_valuesの値を展開
                                // addfilterをclickするたびに更新されるので常に最後に追加したannotationのリスト
                                var content_el = $(divid + "_source").html()
                                var content_wrap = '<div class="cv-options">' + content_el + '</div>'
                                return content_wrap


                            }
                        });


                        // extra_filter選択した際の挙動
                        $('.' + filter_id + '.add_extra_selector[data-toggle="popover"]').on('shown.bs.popover', function () {
                            $('input[name="others"]:radio').change(function () {
                                var annotation_val = $('input[name="others"]:checked').val();

                                annotation_manager(annotation_name, annotation_val);
                                // 文字列#<selector> + ".add_extra_selector を引数として渡す

                                hide_add_selector("#" + filter_id + " .add_extra_selector");
                                show_annotation_value(annotation_name, filter_id, annotation_val);
                                hide_annotation_popover();
                                show_filtered_gene()
                            })
                        })
                    }
                })
            });

            function annotation2cv(annotation) {
                var target = refex_api + "vocablary?annotation=" + annotation;
                return new Promise(function (resolve) {
                    fetch(target)
                    .then(function(response){
                        return response.json()
                    })
                    .then(function (json) {
                        resolve(json)
                    })
                })
            }


            // "select value"button（.add_selector）を隠す
            function hide_add_selector(s){
                $(s).css({"visibility":"hidden", "width": "0px", "height": "0px"});
            }

            // 選択したcvの値を表示・popoverを削除・アノテーション選択した際の結果表示プロセス呼び出し
            function show_annotation_value(annotation,selector, v) {
                var s = "#" + selector + " > .panel > .panel-body";
                $(s).append('<div class="cv">' + v + '<i class="far fa-window-close"></i></div> <!--<div class="add_sample" data-toggle="popover" data-samples="samples"><i class="fas fa-plus-square"></i>select sample</div>-->');
                // .add_sample buttonにpopover
                $('.add_sample').popover({
                    html: true,
                    container: "body",
                    content:function () {
                        var divid = "#" + $(this).data("samples")
                        return $(divid).html()
                    }
                });
                // annotation valueをクリックした際
                $(s + " .cv").click(function(){
                    // annotation_usedより削除
                    annotation_manager(annotation, "", true );

                    // .cvを削除
                    $(s + " .cv").remove();
                    $(s + " .add_sample").remove();
                    // .add_selectorを再び表示する
                    $("#" + selector + " .add_selector").css({"visibility": "visible", "width": "92px", "height": "20px"});
                    $("#" + selector + " .add_extra_selector").css({"visibility": "visible", "width": "92px", "height": "20px"});

                    if (annotation_used.length == 0){
                        store.specific_exp = 0;
                        screener(0);
                    }else{
                        show_filtered_gene();
                    }
                });

                // さらにSampleを選択する場合
                $(s + " .add_sample").click(function () {
                    // sample を表示

                })

            }

            // popoverを削除（popover("destroy")）
            function hide_annotation_popover() {
                $('[data-toggle="popover"]').popover("hide");
            }

            // 遺伝子をfilterし、結果を表示する
            function show_filtered_gene(){
                var samples = [];
                var samples_tmp = [];
                for (var obj of annotation_used){
                    var a = obj.annotation;
                    var v = obj.value;
                    samples_tmp.push(annotation2sample(a,v))
                }

                // annotationが複数であるケースもあるため,Promise.all()で非同期処理の完了を待つ
                Promise.all(samples_tmp)
                    .then(function (sids) {
                        return sids
                    })
                    .then(function (res) {
                        /*
                         アノテーションごとに得られるSampleの積集合を得る。intersection処理を
                        */
                        var samples;
                        if(res.length > 1){
                            samples = intersection(res)
                        }else{
                            samples = res;
                        }
                       // arrayを,区切りの文字列に変換
                        if(samples.length > 0){
                            var sample_str = samples.join(",");
                        }else{
                            sample_str = ""
                        }
                       // sample特異的なフラグを持つ遺伝子を取得しscreener_hander()に渡す
                       sample2gene(sample_str)
                           .then(function(res){
                               // screenerの検索ハンドラを検索結果を引数に呼び出す
                               // 0件であれば空のarray
                               store.specific_exp = res;
                               screener(res);
                           });
                    });
            }

            // 組織特的発現コンポーネントで指定したすべてのfilterについて該当するsampleを取得する
            // annotation2gene()としてserver serversideの処理にした方が早いケース（集合のロジック次第）もあるかも
            function annotation2sample(annotation, value) {
                var target = refex_api + "sample?annotation=" + annotation + "&value=" + value;
                return new Promise(function(resolve) {
                    fetch(target)
                        .then(function (response) {
                            return response.json()
                        })
                        .then(function (json) {
                            resolve(json)
                        });
                });
            }

            // annotationによってフィルターされたサンプルの積集合を利用し、特異的フラグの建つ遺伝子を取得
            function sample2gene(samples) {
                var target = refex_api + "specific_gene?sample=" + samples;
                return new Promise(function (resolve) {
                    fetch(target)
                        .then(function (response) {
                            return response.json()
                        })
                        .then(function (json) {
                            resolve(json)
                        })
                })
            }

            function intersection() {
                var result = [];
                var lists;

                if (arguments.length === 1) {
                    lists = arguments[0];
                } else {
                    lists = arguments;
                }

                for (var i = 0; i < lists.length; i++) {
                    var currentList = lists[i];
                    for (var y = 0; y < currentList.length; y++) {
                        var currentValue = currentList[y];
                        if (result.indexOf(currentValue) === -1) {
                            if (lists.filter(function (obj) {
                                    return obj.indexOf(currentValue) == -1
                                }).length == 0) {
                                result.push(currentValue);
                            }
                        }
                    }
                }
                return result;
            }


            // annotation_used リストの管理
            function annotation_manager(annotation, value, remove = false){
                // すでにannotationが登録されているか
                var anns = annotation_used.map(function (obj) {
                    return obj.annotation
                })
                var i = anns.indexOf(annotation)
                if (remove===true){
                    annotation_used.splice(i, i+1);
                }else if (i >= 0 ){
                    // すでにアノテーションが存在する場合おきかえ
                    annotation_used.splice(i, i+1);
                    //delete annotation_used[i]; // delete はemptyが残るため使わない
                    annotation_used.push({"annotation": annotation, "value": value})
                }else{
                    annotation_used.push({"annotation": annotation, "value": value})
                }
            }
        };




    </script>

</screener-annotation>