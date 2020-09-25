<menu>
    <form class="form-horizontal">
        <div class="form-group">
            <div class="col-sm-11">
                <div class="checkbox" style="display: none">
                    <label>
                        <input type="checkbox" class="col_name" value="value" checked> 発現値（log）
                    </label>
                </div>
                <div class="checkbox" style="display: none">
                    <label>
                        <input type="checkbox" class="col_name" value="sample_description" checked> Description
                    </label>
                </div>
                <div class="checkbox">
                    <label>
                        <input type="checkbox" class="col_name" value="sample_type" checked onchange={on_change_checkbox}> Sample types category
                    </label>
                </div>
                <div class="checkbox">
                    <label>
                        <input type="checkbox" class="col_name" value="experiment" onchange={on_change_checkbox}> Experiments category
                    </label>
                </div>
                <div class="checkbox">
                    <label>
                        <input type="checkbox" class="col_name" value="UBERON" onchange={on_change_checkbox} checked> Tissue type (UBERON)
                    </label>
                </div>
                <div class="checkbox">
                    <label>
                        <input type="checkbox" class="col_name" value="CL" onchange={on_change_checkbox} checked> Cell type (CL)
                    </label>
                </div>
                <div class="checkbox">
                    <label>
                        <input type="checkbox" class="col_name" value="sex" onchange={on_change_checkbox}> sex
                    </label>
                </div>
                <div class="checkbox">
                    <label>
                        <input type="checkbox" class="col_name" value="age" onchange={on_change_checkbox}> age
                    </label>
                </div>
                <div class="checkbox">
                    <label>
                        <input type="checkbox" class="col_name" value="stage" onchange={on_change_checkbox}> Developmental stage
                    </label>
                </div>

                <div class="checkbox">
                    <label>
                        <input type="checkbox" class="col_name" value="NCIT" onchange={on_change_checkbox}> Biomedical concepts by NCIt
                    </label>
                </div>

            </div>
        </div>
    </form>

    <script>
        on_change_checkbox(e){
            // checkboxを変更した際のイベント
            var vals = $('[class="col_name"]:checked').map(function(){
              //$(this)でjQueryオブジェクトが取得できる。val()で値をvalue値を取得。

              return $(this).val();
            }).get();
            window.column_list_changed(vals)
        }

    </script>

</menu>